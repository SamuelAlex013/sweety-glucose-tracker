# Sweety

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Required by the brief: React, Node.js, Express, PostgreSQL. PostgreSQL replaces MongoDB despite the MERN shorthand.

## Users and purpose

A diabetes patient records up to four daily glucose readings and reviews their daily, month-to-date, and previous-month reports. Doctors review reports for patients assigned to their account.

## Capabilities and constraints

Email/password registration; bcrypt password hashing; private reading CRUD; four named daily slots; whole-number values from 40 to 600 mg/dl; dates through today. Each report includes count, highest, lowest, and average to one decimal. Reading history is paginated. Monthly charts plot individual readings. Redis caches reports with invalidation after changes. BullMQ records daily check-ins for patients with open slots. Docker Compose runs the app, PostgreSQL, Redis, and the worker. Doctor accounts are provisioned through a trusted CLI and receive patient assignments.

## Brand commitments

Sweety. The brief asks for design informed by Lovable or another good frontend reference, readable modular code, and meaningful tests.

## Assumptions

The brief explicitly delegates unresolved details to documented assumptions. Calendar dates follow one configured server timezone; reports describe recorded values without diagnosis or clinical target judgments. Demo readings are synthetic.
