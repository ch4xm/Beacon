DROP TABLE IF EXISTS account;
CREATE TABLE account (
	id INTEGER PRIMARY KEY,
	name VARCHAR(20),
	email VARCHAR(20) UNIQUE NOT NULL,
	password VARCHAR(20)
);

DROP TABLE IF EXISTS pin;
CREATE TABLE pin (
	id INTEGER PRIMARY KEY,
	creatorID INTEGER,
	latitude REAL,
	longitude REAL,
	title VARCHAR(200),
	message VARCHAR(500),
	image VARCHAR(2000),
	
	FOREIGN KEY (creatorID) REFERENCES account(id)
);