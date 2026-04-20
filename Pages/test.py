#!/bin/python3
from flask import Flask, jsonify, render_template, request
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from datetime import datetime
from flask_cors import CORS


app = Flask(__name__)
CORS(app)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///project.db"
db = SQLAlchemy(app)


with app.app_context():

    class Hive(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        last_inspection = db.Column(db.DateTime, default=db.func.now())
        box_size = db.Column(db.String(10), nullable=False)
        frames = db.Column(db.String(120), nullable=False)
        location_id = db.Column(db.Integer, db.ForeignKey("location.id"))
        queen = db.relationship("Queen", backref="hive", uselist=False)
        name = db.Column(db.String(120))

    class Queen(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        hive_id = db.Column(db.Integer, db.ForeignKey("hive.id"))
        breed = db.Column(db.String(20), nullable=False)
        intro_date = db.Column(db.String(120))
        colour = db.Column(db.String(20))

    class Location(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(120))
        hives = db.relationship("Hive", backref="at_location", lazy=True)
        coords = db.Column(db.String(120))

        @property
        def number_of_hives(self):
            return len(self.hives)

    class Equipment(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        feed = db.Column(db.Integer)
        prot_hat = db.Column(db.Integer)
        suit = db.Column(db.Integer)

    db.create_all()

    @app.route("/api/add/hive", methods=["POST"])
    def add_hive():
        data = request.get_json()
        last_inspection = datetime.strptime(data.get("last_inspection"), "%Y-%m-%d")
        box_size = data.get("box_size")
        frames = data.get("frames")
        location_id = data.get("location_id")
        name = data.get("name")
        new_hive = Hive(
            box_size=box_size,
            frames=frames,
            location_id=location_id,
            last_inspection=last_inspection,
            name=name,
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

    def remove_hive(hive_id):
        to_be_removed_hive = Hive.query.id(hive_id)
        db.session.remove(to_be_removed_hive)
        db.session.commit()

    def add_queen(**kwargs):
        new_queen = Queen(**kwargs)
        db.session.add(new_queen)
        db.session.commit()

    @app.route("/api/add/location", methods=["POST"])
    def add_location():
        data = request.get_json()
        name = data.get("name")
        coords = data.get("coords")
        new_location = Location(
            name=name,
            coords=coords,
        )
        db.session.add(new_location)
        db.session.commit()
        return jsonify("Completed"), 201

    # add_queen(breed="brit", intro_date="12,1341", colour="blue", hive_id=1)

    @app.route("/api/hives", methods=["GET"])
    def get_hives():
        hives = Hive.query.options(db.joinedload(Hive.at_location)).all()
        # Convert database objects into a list of dictionaries
        output = []
        for hive in hives:
            hive_data = {
                "id": hive.id,
                "last_inspection": hive.last_inspection,
                "frames": hive.frames,
                "location": (
                    hive.at_location.name if hive.at_location else "No Location"
                ),
                "name": (
                    f"{hive.at_location.name} {hive.id}" if not hive.name else hive.name
                ),
            }
            output.append(hive_data)

        return jsonify({"hives": output})

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
                    }
                    for h in loc.hives
                ],
            }
            output.append(location_data)
        return jsonify({"locations": output})


if __name__ == "__main__":
    app.run(debug=True)
