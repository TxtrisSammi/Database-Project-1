# Report

## Application Description

Sortify is a Spotify playlist management app that makes it easier for users to sort
their playlists. It includes a third party genre tagging system so that users
can more accurately tag the genres of individual songs.

## Methodology

- We make requests to the Spotify API for user, track, and playlist data.
- We then store that data in our database.
- We use Express JavaScript routes to display the data in our database on the web app.
- Using the web app we can manipulate data in the database, these updates/deletes activate a trigger which moves the changes to the pending changes table.
- Once the refresh from spotify button is pressed any changes stored in the pending changes are sent to spotify through the API and are deleted from the pending changes table.

### Database

- MariaDB (drop in replacement for MYSQL)

#### Entity Relationship Diagram

![ERD](./Screenshot_08-Dec_13-15-21_25103.png)

#### DDL

[DB Dump](./app_schema.sql)

[Setup.js](./setup.js)

#### DML

[DB Operations Folder](./db)

## Process

- We created an express app connected to a MariaDB database.
- We used CSS to style the web app.
- We created API calls to pull data from spotify into the database.

## Challenges

- Time - One of the challenges that we faced was time management
both due to differences in how we managed our time as well as time restrictions due to work being done in other classes.
- Teamwork - Differences in working style caused conflicts occasionally such as frustrations with work not being done on time.
- Git - Working as a team means we used git, improper use of git caused occasional git conflicts which caused some really minor setbacks at times, these were all resolved but caused some issues down the road.

## Limitations

- Since our app only displays from the database it is at many times out of sync with the actual data that spotify has, meaning that users have to frequently use the "refresh from spotify" button. Also since we only make API calls when the refresh button is pressed it makes the API calls slower since everything is done at one time instead of API calls being made as they're needed. This means that you're often staring at the loading screen especially for larger playlists.

## Future Work

- Ability to tag artists with specific genres (not just tracks)
- Ability to use Shift + Click and CTRL + Click to select multiple items at once.
- Fix genres being stored incorrectly currently they are being stored as a list as opposed to being stored atomically.
- User specific genre/artist information (user statistics are currently just the global statistics of all songs in the DB)

## Conclusion

- It works and does most of what I want it to do - Caleb W.
- Although we were able to complete all of the basic functions that we wanted, we were still left wanting more from the app. Throughout the course of the project we discovered the advantages and disadvantages of databases. Our project started off with a lot of API calls to display data and ended with none (the only API calls go to the database, displayed information all comes from the DB). Although this provided lots of benefits such as making it easier to display statistics since everything could be done using SQL it also made the application as a whole slower and essentially constantly out of sync with spotify. I think if I was to redo this project I would try to have some of our data be displayed through API calls and some be displayed through our database to try to get the best of both worlds. I think the project really put on display our time managment skills as well as our differences in workflow. One of the things I enjoyed the most about this project was the teamwork, although difficult at times it helped me refine my skills when it comes to working with other people. I became more aware of my lack of time management, difficulties when communicating, and difficulties following each other's workflow. If we were to continue working on this in the future it would be nice to add some quality of life features, fix some of the data input, and provide more statistics. Throughout this project, I learned a lot about how databases work, what they're good at, and how to use them within an application. - Samantha M.
