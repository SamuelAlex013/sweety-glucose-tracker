# Sweety

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React, Node.js, Express, and PostgreSQL, as specified in the assignment. Redis and BullMQ support caching and reminder jobs.

## Users and purpose

A diabetes patient records up to four daily glucose readings and reviews their daily, month-to-date, and previous-month reports. Doctors review reports for patients assigned to their account.

## Capabilities and constraints

Email/password registration; bcrypt password hashing; private reading CRUD; four named daily slots; whole-number values from 40 to 600 mg/dl; dates through today. Each report includes count, highest, lowest, and average to one decimal. Reading history is paginated. Monthly charts plot individual readings. Redis caches reports with invalidation after changes. BullMQ records daily check-ins for patients with open slots. Docker Compose runs the app, PostgreSQL, Redis, and the worker. Doctor accounts are provisioned through a trusted CLI and receive patient assignments.

## Brand commitments

Sweety uses a daily journal layout with four meal slots, clear period controls, and a shared neutral palette. Lovable's Customer Health Dashboard informed the initial layout.

## Assumptions

Calendar dates follow one configured server timezone. Reports show recorded values and arithmetic summaries. Demo readings are synthetic.
