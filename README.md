# Media Tracker
Track all the media that you experienced and want to experience in one place. Currently, supports: Movies, TV Series, Video Games

## Overview
This app allows users to make a list of all the media they want to keep track on. 
Items on the list may contain information about: 
* Experienced - Whether this item was viewed/played.
* Re-Experience - If this item has been experienced, is there a desire to experience it again?
* Rating - User may rate the item between 1-10 stars.
* Comment - User may add a short comment about the item.

This app also incorporated the ability to view other users list, as well as following them. 
Searching for a user can be done:
* By name
* By sorting default list according to: Registration Date, Last Active Date, How many Ratings, How many followers
* By filtering Admins or Users
* Advanced Search: Decide on up to 5 items and range of rating for each. Search will find all users which rated these items accordingly

Following a user allows:
* Find user conveniently on the Follow section.
* Receive alerts when followed user rates an item above a requested threshold.

If a user is also an Admin, it receives these features:
* Ability to add and update media items, either one by one or via uploading a CSV file.
* When an Admin user is viewed by other users, they will see that he is an Admin.
* When users view an Admin list, comments are visible (comments are invisible by default for regular users).

## Quick Start (Run with Docker)
This project is fully containerized.
You do not need to install Java, Node.js, PostgreSQL, Kafka, or any other dependency on your machine.

The only requirement is Docker.

### Prerequisites
Install Docker

Windows / macOS - Download and install Docker Desktop from:
https://www.docker.com/products/docker-desktop/

Linux - Follow the official instructions for your distribution:
https://docs.docker.com/engine/install/

After installation, make sure Docker is running. \
You can verify Docker is installed by running:
```bash
docker --version
docker compose version
```
If both commands print a version, you are ready.

#### Step 1: Clone the repository
Run this command where you wish to place project code directory
```bash
git clone https://github.com/amirtwilc/MediaTracker.git
cd MediaTracker
```

#### Step 2: Start the entire application
From the root of the project, run:
```bash
docker compose up --build
```
This may take several minutes the first time because Docker needs to download dependencies.

#### Step 3: Wait until everything is ready
When the startup is complete, you should see logs indicating that:
* PostgreSQL is running
* Kafka is running (Divided into ZooKeeper and Kafka)
* Backend started successfully
* Frontend is being served

You should also see "mediatracker" under Docker Desktop's Container's tab. 
Check that all components have started. If one or more of the component have failed to start, you may try to start it again via the UI. 
If still does not start, check the logs to identify the problem.

#### Step 4: Access the application
Frontend (Web UI):
http://localhost:3000

Backend API:
http://localhost:8080

#### Step 5: Login/Register to the app
In order to login as an Admin, enter these values:  
User: Admin  
Password: 123456  
Admin may Create and update items in the app.  
Alternatively, register a new user to the app. 

#### Step 6: Initialize items in database
There "Search Media" tab will not display any items at this stage. 
For this step, you must be logged as an Admin.  
Go to "Admin Panel" tab -> Upload CSV -> Choose file -> Choose file from root of this project, named: "media_tracker_sample.csv" -> Click Upload CSV  
Once the process is finished, items will appear at "Search Media" tab, and the app is ready for use.
Alternatively, or consecutively, make your own CSV file according to the guidelines, and upload it.

#### Stopping the application

To stop everything, press: CTRL + C  
Then cleanly shut down containers with:
```bash
docker compose down
```
Your database data is preserved unless you explicitly remove volumes.

#### Troubleshooting

If something goes wrong:

1. Make sure Docker is running
2. Run:
```bash
docker compose down
docker compose up --build
```
3. If ports 3000 or 8080 are already in use, stop the conflicting applications

## Core Motivation
This project is meant to demonstrate my ability to design and build applications.
It is also a great foundation and reason for me to learn new technologies, AI tools, and software principals that I wish to learn.
For this reason, some features on this project are not necessarily using the best approaches, 
and might have been coded differently in reality. 
In the next paragraphs I will try to explain my rationale for the main components and technologies used in this project.

## Architecture
Project is built as Monolith for simplicity.

### Technologies 

Backend language: Java Spring - This is where my experience lies. The main goal of this project is to demonstrate my Java Spring knowledge and expertise. 

Database: PostgresSQL - Mainly picked for get-to-know purposes. I also believe relational database is a good decision here.

Message Queue: Kafka - Picked because of my strong experience and is an important technology to demonstrate knowledge of.

Frontend language: React - Although this a language I want to learn more about, learning it was not main concern for this project, and most code was written by AI. 
I really just wanted a powerful language to showcase my backend visually, my way of thinking and attention to detail, and also my ability to create powerful application even without full knowledge of a language. 
It is still a sub goal of mine, to understand how every line works and by extension - learn React

AI tools: Claude, ChatGPT, Cursor, Windsurf

### Core decisions

#### Saving Items Via CSV Uploading
The app allows admins to create a CSV file, following specific structure and uploading it. Doing so registers items to the DB in a bulk, rather than one-by-one. \
The only real reason for this approach is that I really wanted to integrate Spring Batch in one way or another. \
I don't believe this is the best approach for this particular problem. \
Disadvantages: 
* Admins must always create manual CSV files, maintaining new movies/TV shows/Games at all times. Also, platforms keep changing and must be updated
* Admins might make mistakes, typos etc.

Possible better solution:
* There are already global APIs with huge databases, which could be easily queried and saved directly and automatically to the app's database.

#### Platform inconsistency
One of the fun features I wanted to add was the option to filter by platform (Netflix, Disney+, etc.). \
So if a user says "I have Netflix, what can I watch?", then this app could help decide. \
The problem is that each streaming service usually has different libraries based on one's current region. \
Currently, the app does not support, nor have the ability, to differentiate between different regions. \
Possible solutions:
* - Assuming there are global APIs that has this information for all regions, this is probably the easiest approach.
  - Since medias sometimes have expiration time until they are unavailable at current streaming service, APIs would be required to be fetched regularly or expiration dates will have to be maintained
  - Each item will hold a ManyToMany relationship to region, as well as platform.
  - Users will declare what is their region to filter unrelated regions.
* Each user will manage its own "region". Platforms will remain as is today, where each item displays ALL known platforms, 
regardless of region, and users will have the option to mark each item as "Not available to me". They will need the option to cancel mark as well.

#### Items might be missing
Even with the most reliable approach to maintain up-to-date items at all times, some items are destined to be missing (That one show from that one country, which a user really wanted to track). 
Users might want the ability to suggest items, or at least maintain their own items. 

Things to consider:

- Need to decide how notifications would be handled on these rated items: Would followers still be interested in these less known items?
- Ability to suggest means Admins needs to review and approve, but over-using this feature means a lot of work that is piling up. 
- Maintaining own items means users might add garbage items or add items that are already available.

The solution for both latter cases is probably to limit the new items allowed to suggest/save at each X days.

## Next Steps

* Make the app live, accessible from everywhere
* Authentication should be extended. For example, currently no way to recover password
* Ability to extract own list into file. 
* Create/Fetch items more efficiently - probably via global APIs
* Add posters. There are global APIs which allow to simply fetch directly from them, instead of saving all in own db. If fetch fails, return to normal behavior
* Solve problem of showing correct platforms for users, based on region
* Allow users to suggest or add items. Maybe have a central place where users can see other users' suggestions and vote






