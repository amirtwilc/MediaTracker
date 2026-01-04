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
Even with the most reliable approach to maintain up-to-date items at all times, some items are destined to be missing. \
Users might want the ability to suggest items, or at least maintain their own items. 

Things to consider:

- Need to decide on notification on these rated items: would followers still be interested in these less known items?
- Ability to suggest means an Admin needs to review, but over using means work that is piling up. 
- Maintaining own items means users might add garbage items or add items that already available.

  The solution for both latter cases is probably to limit the new items allowed to suggest/save at each X days.




