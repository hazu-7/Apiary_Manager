#!/bin/python3
from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///project.db'
db = SQLAlchemy(app)

     


with app.app_context():

    class Hive(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        last_inspection = db.Column(db.String(120), nullable=False)
        max_box_size = db.Column(db.String(10), nullable=False)
        frames = db.Column(db.String(120), nullable=False)
        varoa_found = db.Column(db.Integer)
        location = db.Column(db.String(120))
        queen = db.relationship("Queen", backref="hive", uselist=False)
            
    class Queen(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        hive_id = db.Column(db.Integer, db.ForeignKey('hive.id'))
        breed = db.Column(db.String(20), nullable=False)
        intro_date = db.Column(db.String(120))
        colour = db.Column(db.String(20)) 
        
    class Location(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        number_of_hives = db.Column(db.Integer)
        coords = db.Column(db.String(120))
    
    class Equipment(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        feed = db.Column(db.Integer)
        prot_hat = db.Column(db.Integer)
        suit = db.Column(db.Integer)
            
    db.create_all()

    def add_hive(**kwargs):
        new_hive = Hive(**kwargs)
        db.session.add(new_hive)
        db.session.commit()
        
    def remove_hive(hive_id):
        to_be_removed_hive = Hive.query.id(hive_id) 
        db.session.remove(to_be_removed_hive)
        db.session.commit()
    
    def add_queen(**kwargs ):
        new_queen = Queen(**kwargs)
        db.session.add(new_queen)
        db.session.commit()
    
    
        
    add_queen(breed = "brit", intro_date = "12,1341", colour="blue", hive_id = 1)
    add_hive(last_inspection = "12/10/2024", max_box_size="10", frames="Honey=4 Polen=2 Brood=3", varoa_found=0, location="Guweya")
    
    @app.route('/api/hives', methods=['GET'])
    def get_hives():
        hives = Hive.query.all()
        # Convert database objects into a list of dictionaries
        output = []
        for hive in hives:
            hive_data = {
                'id': hive.id,
                'location': hive.location,
                'last_checked': hive.last_checked,
                'varoa_found': hive.varoa_found
            }
            output.append(hive_data)
        
        return(jsonify({'hives:':output}))
    
    @app.route('/api/queens', methods=['GET'])
    def get_queens():
        queens = Queen.query.all()
        output = []
        for queen in queens:
            queen_data = {
                'id' : queen.id,
                'breed':queen.breed,
                'intro_date':queen.intro_date,
                'colour':queen.colour
            }
            output.append(queen_data)
        return jsonify({'queens':output})
    
    @app.route('/api/locations', methods=['GET'])
    def get_locations():
        locations = Location.query.all()
        output =[]
        for loc in locations:
            location_data = {
                'id' : loc.id,
                'number_of_hives' : loc.number_of_hives,
                'coords' : loc.coords,
            }
            output.append(location_data)
        return jsonify({'locations' : output})

if __name__ == '__main__':  
   app.run()  