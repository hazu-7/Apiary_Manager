#!/bin/python3
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from datetime import datetime
from flask_cors import CORS
import os
import shutil


app = Flask(__name__)
CORS(app)
UPLOAD_PATH = "static/uploads"
app.config["UPLOAD_PATH"] = UPLOAD_PATH
os.makedirs(app.config["UPLOAD_PATH"], exist_ok=True)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
db = SQLAlchemy(app)


with app.app_context():

    class Hive(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        last_inspection = db.Column(db.DateTime, default=db.func.current_date())
        box_size = db.Column(db.String(10), nullable=False)
        frames = db.Column(db.String(120), nullable=False)
        location_id = db.Column(db.Integer, db.ForeignKey("location.id"))
        queen_id = db.Column(db.Integer, db.ForeignKey("queen.id"))
        image_id = db.Column(db.Integer, db.ForeignKey("image.id"))
        name = db.Column(db.String(120))

    class Queen(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        hive_id = db.relationship("Hive", backref="queen", lazy=True)
        breed = db.Column(db.String(20), default="Unknown")
        intro_date = db.Column(db.String(120), default=db.func.current_date())
        colour = db.Column(db.String(20))

    class Location(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(120), default="No Location")
        hives = db.relationship("Hive", backref="at_location", lazy=True)
        coords = db.Column(db.String(120))

        @property
        def number_of_hives(self):
            return len(self.hives)

    class Image(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        path = db.Column(db.String(200))
        image = db.relationship("Hive", backref="image_info", lazy=True)

    class Equipment(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        feed = db.Column(db.Integer)
        prot_hat = db.Column(db.Integer)
        suit = db.Column(db.Integer)

    db.create_all()

    @app.route("/api/hives", methods=["GET"])
    def get_hives():
        hives = Hive.query.options(db.joinedload(Hive.at_location)).all()
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
            }
            output.append(hive_data)

        return jsonify({"hives": output})

    @app.route("/api/add/hive", methods=["POST"])
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
            box_size=box_size,
            frames=frames,
            location_id=location_id,
            last_inspection=last_inspection,
            name=name,
            queen_id=queen_id,
            image_id=image_id,
        )
        try:
            db.session.add(new_hive)
            db.session.commit()
            return (
                jsonify({"message": "Hive added successfully", "id": new_hive.id}),
                201,
            )
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/update/hive/<int:hive_id>", methods=["PUT"])
    def update_hive(hive_id):
        hive = Hive.query.get_or_404(hive_id)
        data = request.get_json()
        try:
            hive.name = data.get("name", hive.name)
            hive.location_id = data.get("location_id", hive.location_id)
            hive.box_size = data.get("box_size", hive.box_size)
            hive.frames = data.get("frames", hive.frames)

            if data.get("last_inspection"):
                hive.last_inspection = datetime.strptime(
                    data.get("last_inspection"), "%Y-%m-%d"
                )

            db.session.commit()
            return jsonify({"success": True, "message": "Hive updated"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/remove/hive/<int:hive_id>", methods=["DELETE"])
    def remove_hive(hive_id):
        to_be_removed_hive = Hive.query.get_or_404(hive_id)
        try:
            db.session.delete(to_be_removed_hive)
            db.session.commit()
            return jsonify({"success": True, "message": "Hive removed"}), 200
        except Exception as e:
            db.session.rollback()
            print(f"error {e}")
            return jsonify({"message": "An error has occured."}), 400

    @app.route("/api/queens", methods=["GET"])
    def get_queens():
        queens = Queen.query.all()
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

    @app.route("/api/add/queen", methods=["POST"])
    def add_queen():
        data = request.get_json()
        breed = data.get("breed")
        colour = data.get("colour")
        intro_date = data.get("intro_date")
        new_queen = Queen(
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

    @app.route("/api/locations", methods=["GET"])
    def get_locations():
        locations = Location.query.all()
        output = []
        for loc in locations:
            location_data = {
                "name": loc.name,
                "id": loc.id,
                "number_of_hives": loc.number_of_hives,
                "coords": loc.coords,
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

    @app.route("/api/add/location", methods=["POST"])
    def add_location():
        data = request.get_json()
        name = data.get("name")
        coords = data.get("coords")
        new_location = Location(
            name=name,
            coords=coords,
        )
        try:
            db.session.add(new_location)
            db.session.commit()
            return (jsonify({"success": True}), 201)
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

    @app.route("/api/add/image", methods=["POST"])
    def upload_image():
        data = request.files.get("image")
        filename = request.form.get("fileName")
        path = os.path.join(app.config["UPLOAD_PATH"], f"{filename}.jpg")

        if data:
            data.save(path)
        else:
            path = os.path.join(app.config["UPLOAD_PATH"], "default.jpg")
            default_image_source = (
                "/home/hazu/Programming/repos/Apiary_Manager/images/uploadHive.png"
            )
            shutil.copy(default_image_source, path)
            return (jsonify({"success": True, "image_id": 1}), 201)
        new_image = Image(path=path)
        try:
            db.session.add(new_image)
            db.session.commit()
            print(f"File saved to: {os.path.abspath(path)}")
            return (jsonify({"success": True, "image_id": new_image.id}), 201)
        except Exception as e:
            print(f"error {e}")
            return (jsonify({"message": "An error has occured."}), 400)

    





if __name__ == "__main__":
    app.run(debug=True)
