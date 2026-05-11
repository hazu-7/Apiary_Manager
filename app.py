#!/bin/python3
from flask import (
    Flask,
    jsonify,
    request,
    redirect,
    url_for,
    render_template,
    session,
    flash,
)
from sqlalchemy.exc import IntegrityError
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func, text
from datetime import datetime, timedelta
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
import os
import shutil
import dotenv

# Load environment variables from .env file if it exists
dotenv.load_dotenv()

app = Flask(__name__)
CORS(app)
# define Upload_path variable
UPLOAD_PATH = "static/uploads"
app.config["UPLOAD_PATH"] = UPLOAD_PATH
# Creates the directory for uploaded files if it doesnt exist
os.makedirs(app.config["UPLOAD_PATH"], exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///MyHive.db"
# get secret key from environment variable. if not set default to mysecret
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "mysecret")
app.config["PERMANENT_SESSION_LIFETIME"] = timedelta(days=14)
db = SQLAlchemy(app)


with app.app_context():
    # Define Hive table in database
    class Hive(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
        last_inspection = db.Column(db.DateTime, default=db.func.current_date())
        box_size = db.Column(db.String(10), nullable=False)
        frames = db.Column(db.String(120), nullable=False)
        location_id = db.Column(db.Integer, db.ForeignKey("location.id"))
        queen_id = db.Column(db.Integer, db.ForeignKey("queen.id"))
        image_id = db.Column(db.Integer, db.ForeignKey("image.id"))
        feed = db.Column(db.String(40))
        name = db.Column(db.String(120))
        notes = db.Column(db.String(500), default="")

    # Define Queen table in database
    class Queen(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
        hive_id = db.relationship("Hive", backref="queen", lazy=True)
        breed = db.Column(db.String(20), default="Unknown")
        intro_date = db.Column(db.String(120), default=db.func.current_date())
        colour = db.Column(db.String(20))

    # Define Location table in database
    class Location(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey("user.id"))
        name = db.Column(db.String(120), default="No Location")
        hives = db.relationship("Hive", backref="at_location", lazy=True)
        Longitude = db.Column(db.Integer, default="Undefined")
        Latitude = db.Column(db.Integer, default="Undefined")

        @property
        def number_of_hives(self):
            return len(self.hives)

        max_number_of_hives = db.Column(db.Integer, default=0)

    # Define Image table in database
    class Image(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        path = db.Column(db.String(200))
        image = db.relationship("Hive", backref="image_info", lazy=True)

    # Define User table in database
    class User(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        username = db.Column(db.String(80), unique=True, nullable=False)
        email = db.Column(db.String(80), unique=True)
        password_hash = db.Column(db.String(256), nullable=False)
        hives = db.relationship("Hive", backref="owner")
        locations = db.relationship("Location", backref="owner")
        queens = db.relationship("Queen", backref="owner")

    # Create tables in database if they dont exist
    db.create_all()

    try:
        # If default hive image not in db add to db
        if not db.session.get(Image, 1):
            db.session.add(
                Image(
                    id=1,
                    path="static/uploads/default.jpg",
                )
            )
            db.session.commit()
        else:
            print("Default image exists")
    except Exception as e:
        db.session.rollback()
        print("An error has occured!", e)

    if User.query.count() == 0:
        # get inital password form environment. if not set default to admin
        initial_pw = os.environ.get("INITIAL_PASSWORD", "admin")
        db.session.add(
            User(
                username="admin",
                password_hash=generate_password_hash(initial_pw),
            )
        )
        db.session.commit()
        print(
            f"Created default user 'username : admin\npassword: {initial_pw}'.\n "
            "Set INITIAL_PASSWORD or SECRET_KEY for production."
        )

    # Redirects all requests to server to login page if user has no valid session id
    @app.before_request
    def require_login():
        if session.get("user_id") is not None:
            return
        if request.endpoint in ("login", "logout", "static", "register_user"):
            return
        if request.path.startswith("/static/"):
            return
        if request.path.startswith("/api/"):
            return jsonify({"message": "Unauthorized"}), 401
        return redirect(url_for("login", next=request.path))

    @app.route("/login", methods=["GET", "POST"])
    def login():
        if session.get("user_id") is not None:
            return redirect(url_for("dashboard"))
        if request.method == "POST":
            username = (request.form.get("username") or "").strip()
            password = request.form.get("password") or ""
            user = User.query.filter_by(username=username).first()
            if user and check_password_hash(user.password_hash, password):
                session["user_id"] = user.id
                session.permanent = True
                next_path = request.form.get("next") or request.args.get("next")
                if (
                    next_path
                    and next_path.startswith("/")
                    and not next_path.startswith("//")
                ):
                    return redirect(next_path)
                return redirect(url_for("dashboard"))
            flash("Invalid username or password.", "error")
        return render_template(
            "login.html",
        )

    @app.route("/register", methods=["POST"])
    def register_user():
        try:
            data = request.get_json()
            username = data.get("username")
            email = data.get("email")
            password = data.get("password")
            hashed_password = generate_password_hash(password)
            new_user = User(
                username=username, email=email, password_hash=hashed_password
            )
            db.session.add(new_user)
            db.session.commit()
            return (jsonify({"success": True}), 200)
        except IntegrityError as e:
            db.session.rollback()
            if "username" in str(e.orig):
                return (jsonify({"message": "Username already exists"}), 400)
            elif "email" in str(e.orig):
                return (jsonify({"message": "Email already exists"}), 400)
        except Exception as e:
            db.session.rollback()
            print("error", e)
            return (jsonify({"message": "An error has occured."}), 400)

    @app.route("/logout")
    def logout():
        session.clear()
        return redirect(url_for("login"))

    @app.route("/api/hives", methods=["GET"])
    def get_hives():
        user = db.session.get(User, session["user_id"])
        hives = user.hives

        # Convert database objects into a list of dictionaries
        output = []
        for hive in hives:
            hive_data = {
                "id": hive.id,
                "last_inspection": hive.last_inspection,
                "box_size": hive.box_size,
                "frames": hive.frames,
                "location_id": hive.location_id,
                "queen_id": hive.queen_id,
                "location": (
                    hive.at_location.name if hive.at_location else "No Location"
                ),
                "name": (
                    f"{hive.at_location.name} {hive.id}" if not hive.name else hive.name
                ),
                "image": hive.image_info.path,
                "image_id": hive.image_info.id,
                "notes": hive.notes or "",
                "feed": hive.feed or "",
            }
            output.append(hive_data)

        return jsonify({"hives": output})

    @app.route("/api/hive/add", methods=["POST"])
    def add_hive():
        data = request.get_json()
        last_inspection = datetime.strptime(data.get("last_inspection"), "%Y-%m-%d")
        box_size = data.get("box_size")
        frames = data.get("frames")
        location_id = data.get("location_id")
        name = data.get("name")
        queen_id = data.get("queen_id")
        image_id = data.get("image_id")

        new_hive = Hive(
            user_id=session.get("user_id"),
            box_size=box_size,
            frames=frames,
            location_id=location_id,
            last_inspection=last_inspection,
            name=name,
            queen_id=queen_id,
            image_id=image_id,
        )
        location = db.session.get(Location, location_id)
        try:
            db.session.add(new_hive)
            location.max_number_of_hives += 1
            db.session.commit()
            return (
                jsonify({"message": "Hive added successfully", "id": new_hive.id}),
                201,
            )
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/hive/update/<int:hive_id>", methods=["PUT"])
    def update_hive(hive_id):
        hive = db.session.get(Hive, hive_id)
        data = request.get_json()

        original_location = hive.at_location

        try:
            new_location_id = data.get("location_id", hive.location_id)
            new_location = db.session.get(Location, new_location_id)

            hive.name = data.get("name", hive.name)
            hive.location_id = new_location_id
            hive.box_size = data.get("box_size", hive.box_size)
            hive.frames = data.get("frames", hive.frames)
            if "queen_id" in data:
                hive.queen_id = data.get("queen_id")

            if data.get("last_inspection"):
                hive.last_inspection = datetime.strptime(
                    data.get("last_inspection"),
                    "%Y-%m-%d",
                )

            if "notes" in data:
                notes = data.get("notes") or ""
                if len(notes) > 500:
                    return (
                        jsonify({"message": "Notes must be 500 characters or less."}),
                        400,
                    )
                hive.notes = notes

            if "feed" in data:
                feed = data.get("feed")
                if isinstance(feed, bool):
                    hive.feed = "added" if feed else ""
                else:
                    hive.feed = (feed or "")[:40]

            # Update relationships
            db.session.flush()

            # Update max hive count for new location
            # Remove old location if empty
            if original_location.id != new_location_id:
                if len(original_location.hives) == 0:
                    db.session.delete(original_location)
                    new_location.max_number_of_hives = max(
                        new_location.max_number_of_hives + 1, len(new_location.hives)
                    )

            db.session.commit()

            return jsonify({"success": True, "message": "Hive updated"}), 200

        except Exception as e:
            db.session.rollback()
            print(f"error {e}")

            return jsonify({"message": "An error has occurred."}), 400

    @app.route("/api/hive/remove/<int:hive_id>", methods=["DELETE"])
    def remove_hive(hive_id):
        to_be_removed_hive = db.session.get(Hive, hive_id)
        location = to_be_removed_hive.at_location
        queen = to_be_removed_hive.queen
        try:
            if location != None:
                if location.number_of_hives == 1:
                    remove_location(location.id)
            if queen != None:
                remove_queen(queen.id)
            if to_be_removed_hive.image_id != 1:
                remove_image(to_be_removed_hive.image_id)

            db.session.delete(to_be_removed_hive)
            db.session.commit()
            return jsonify({"success": True, "message": "Hive removed"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/queens", methods=["GET"])
    def get_queens():
        user = db.session.get(User, session["user_id"])
        queens = user.queens
        output = []
        for queen in queens:
            queen_data = {
                "id": queen.id,
                "breed": queen.breed,
                "intro_date": queen.intro_date,
                "colour": queen.colour,
            }
            output.append(queen_data)
        return jsonify({"queens": output})

    @app.route("/api/queen/add", methods=["POST"])
    def add_queen():
        data = request.get_json()
        breed = data.get("breed")
        colour = data.get("colour")
        intro_date = data.get("intro_date")
        new_queen = Queen(
            user_id=session["user_id"],
            breed=breed,
            colour=colour,
            intro_date=intro_date,
        )
        try:
            db.session.add(new_queen)
            db.session.commit()
            return (jsonify({"success": True, "queen_id": new_queen.id}), 201)
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/queen/update/<int:queen_id>", methods=["PUT"])
    def update_queen(queen_id):
        queen = db.session.get(Queen, queen_id)
        if not queen or queen.user_id != session.get("user_id"):
            return jsonify({"message": "Queen not found"}), 404

        data = request.get_json() or {}
        uid = session.get("user_id")
        target_hive = None
        if "hive_id" in data:
            target_hive_id = data.get("hive_id")
            if target_hive_id is not None:
                target_hive = db.session.get(Hive, int(target_hive_id))
                if target_hive is None or target_hive.user_id != uid:
                    return jsonify({"message": "Hive not found"}), 404

        try:
            queen.breed = data.get("breed", queen.breed)
            queen.colour = data.get("colour", queen.colour)
            queen.intro_date = data.get("intro_date", queen.intro_date)

            if "hive_id" in data:
                assigned = Hive.query.filter_by(user_id=uid, queen_id=queen.id).all()
                for hive in assigned:
                    hive.queen_id = None
                if target_hive is not None:
                    target_hive.queen_id = queen.id

            db.session.commit()
            return jsonify({"success": True, "message": "Queen updated"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/queen/remove/<int:queen_id>", methods=["DELETE"])  # TBI
    def remove_queen(queen_id):
        queen_to_remove = db.session.get(Queen, queen_id)
        if not queen_to_remove or queen_to_remove.user_id != session.get("user_id"):
            return jsonify({"message": "Queen not found"}), 404
        try:
            hives_with_queen = Hive.query.filter_by(
                user_id=session.get("user_id"), queen_id=queen_to_remove.id
            ).all()
            for hive in hives_with_queen:
                hive.queen_id = None
            db.session.delete(queen_to_remove)
            db.session.commit()
            return jsonify({"success": True, "message": "Queen Removed"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/locations", methods=["GET"])
    def get_locations():
        user = db.session.get(User, session["user_id"])
        locations = user.locations
        output = []
        for loc in locations:
            mx = max(loc.max_number_of_hives, loc.number_of_hives)
            location_data = {
                "name": loc.name,
                "id": loc.id,
                "number_of_hives": loc.number_of_hives,
                "lng": loc.Longitude,
                "lat": loc.Latitude,
                "max_number_of_hives": mx,
                "hives": [
                    {
                        "id": h.id,
                        "last_inspection": h.last_inspection,
                        "location": loc.name,
                        "image": h.image_info.path,
                        "name": h.name,
                    }
                    for h in loc.hives
                ],
            }
            output.append(location_data)
        return jsonify({"locations": output})

    @app.route("/api/location/add", methods=["POST"])
    def add_location():
        data = request.get_json()
        name = data.get("name").lower()
        Longitude = data.get("Longitude")
        Latitude = data.get("Latitude")
        new_location = Location(
            name=name,
            user_id=session["user_id"],
            Longitude=Longitude,
            Latitude=Latitude,
        )
        try:
            db.session.add(new_location)
            db.session.commit()
            return (jsonify({"success": True}), 201)
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/location/update/<int:location_id>", methods=["PUT"])
    def update_location(location_id):
        location = db.session.get(Location, location_id)
        data = request.get_json()
        try:
            location.name = data.get("name")
            location.Latitude = data.get("lat")
            location.Longitude = data.get("lng")
            db.session.commit()
            return jsonify({"success": True, "message": "Hive updated"}), 200
        except Exception as e:
            db.session.rollback()
            print("Error occured:", e)
            return jsonify({"message": "An error has occured"}), 400

    @app.route("/api/location/remove/<int:location_id>", methods=["DELETE"])
    def remove_location(location_id):
        location_to_remove = db.session.get(Location, location_id)
        try:
            db.session.delete(location_to_remove)
            db.session.commit()
            return jsonify({"success": True, "message": "Location Removed"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/images", methods=["GET"])
    def get_images():
        images = Image.query.all()
        output = []
        for img in images:
            img_data = {
                "id": img.id,
                "path": img.path,
            }
            output.append(img_data)
        return jsonify({"images": output})

    @app.route("/api/image/add", methods=["POST"])
    def upload_image():
        data = request.files.get("image")
        filename = request.form.get("fileName")
        path = os.path.join(app.config["UPLOAD_PATH"], f"{filename}.jpg")

        if data:
            data.save(path)
        else:
            path = os.path.join(app.config["UPLOAD_PATH"], "default.jpg")
            default_image_source = "/home/hazu/Programming/repos/Apiary_Manager/static/images/uploadHive.png"
            shutil.copy(default_image_source, path)
            return (jsonify({"success": True, "image_id": 1}), 201)
        new_image = Image(path=path)
        try:
            db.session.add(new_image)
            db.session.commit()
            print(f"File saved to: {os.path.abspath(path)}")
            return (jsonify({"success": True, "image_id": new_image.id}), 201)
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return (jsonify({"message": "An error has occured."}), 400)

    @app.route("/api/image/update/<int:image_id>", methods=["PUT"])
    def update_image(image_id):
        print(image_id)
        image = db.session.get(Image, image_id)
        data = request.files.get("image")
        filename = request.form.get("fileName")
        path = os.path.join(app.config["UPLOAD_PATH"], f"{filename}.jpg")

        if data:
            data.save(path)
            if "default.jpg" not in image.path and path != image.path:
                os.remove(image.path)
        else:
            path = os.path.join(app.config["UPLOAD_PATH"], "default.jpg")
            default_image_source = "/home/hazu/Programming/repos/Apiary_Manager/static/images/uploadHive.png"
            shutil.copy(default_image_source, path)
            return (jsonify({"success": True, "image_id": 1}), 201)
        try:
            image.path = path
            db.session.commit()
            print(f"File saved to: {os.path.abspath(path)}")
            return (jsonify({"success": True, "image_id": image.id}), 201)
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return (jsonify({"message": "An error has occured."}), 400)

    @app.route("/api/image/remove/<int:image_id>", methods=["DELETE"])
    def remove_image(image_id):
        if image_id == 1:
            return jsonify({"success": True, "message": "Image Removed"}), 200
        else:
            image_to_be_removed = db.session.get(Image, image_id)
            try:
                os.remove(image_to_be_removed.path)
                db.session.delete(image_to_be_removed)
                db.session.commit()
                return jsonify({"success": True, "message": "Image Removed"}), 200
            except Exception as e:
                db.session.rollback()
            print(f"error {e}")
            return (jsonify({"message": "An error has occured."}), 400)

    @app.route("/")
    def dashboard():
        return render_template("dashboard.html")

    @app.route("/hives")
    def hives_page():
        return render_template("hives.html")

    @app.route("/queens")
    def queens_page():
        return render_template("queens.html")

    @app.route("/inspections")
    def inspections():
        return render_template("inspections.html")

    @app.route("/locations")
    def locations():
        return render_template("locations.html")


if __name__ == "__main__":
    app.run()
