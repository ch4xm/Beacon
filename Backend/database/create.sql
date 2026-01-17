DROP TABLE IF EXISTS account;
CREATE TABLE account (
	id INTEGER PRIMARY KEY,
	name VARCHAR(20),
	email VARCHAR(20) UNIQUE,
	password VARCHAR(20)
);

DROP TABLE IF EXISTS pin;
CREATE TABLE pin (
	id INTEGER PRIMARY KEY,
	creatorID INTEGER,
	latitude REAL,
	longitude REAL,
	title VARCHAR(200),
	message VARCHAR(200),
	email VARCHAR(32),
	image VARCHAR(2000),
	color VARCHAR(10) DEFAULT "#0000FF",

	FOREIGN KEY (creatorID) REFERENCES account(id)
);