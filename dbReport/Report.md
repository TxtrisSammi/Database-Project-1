# Report

## Application Description

Sortify is a Spotify playlist management app that makes is easier for user to sort
their playlists and includes a third party genre tagging system so that users
can more accurately tag the genres of individual songs.

## Methodology

We make requests to the Spotify API for user, track, and playlist data.
We then store that data in our database so that we can leverage
relational queries to easier sort the user's playlists for them.

### Database

MariaDB (drop in replacement for MYSQL)

#### ERD

![ERD](./Screenshot_08-Dec_13-15-21_25103.png)

#### DDL

[DB Dump](./app_schema.sql)

[Setup.js](./setup.js)

#### DML

[DB Operations Folder](./db)

## Process

We created an express app connected to a MariaDB database.

## Challenges

- Time

## Limitations

Requires all data to be stored in the DB

## Future Work

- Artist wide genre tagging
- Shift and control clicking for mass operations
- Fix genres being stored incorrectly

## Conclusion

It works and does most of what I want it to do - Caleb
