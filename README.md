# Media Tracker
Track all the media that you experienced and want to experience in one place. Currently supports: Movies, TV Series, Video Games

## Overview
This app allows users to make a list of all the media they want to keep track on. 
Items on the list may contain information about: 
* Experienced - Whether this item was viewed/played.
* Re-Experience - If this item has been experienced, is there a desire to experience it again?
* Rating - User may rate the item between 1-10 stars.
* Comment - User may add a short comment about the item.

This app also incorporated the ability to view other users list, as well as following them. 
Following a user allows:
* Find user conveniently on the Follow section.
* Receive alerts when followed user rates an item above a given threshold.

If a user is also an Admin, it receives these features:
* Ability to add and update media items, either one by one or via uploading a CSV file.
* When an Admin user is viewed by other users, they will see that he is an Admin.
* When users view an Admin list, comments are visible (comments are invisible by default for regular users).

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

Frontend language: React - Although this a language I want to learn more about, learning it was not main concern at this time, and most code was written by AI. 
I really just wanted a powerful language to showcase my backend visually, my way of thinking and attention to detail, and also my ability to create powerful application even without full knowledge of a language. 
It is still a sub goal of this project, to understand how every line works and by that - learn React

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

#### Items might be missing




