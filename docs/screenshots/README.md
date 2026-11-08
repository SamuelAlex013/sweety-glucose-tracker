# Sweety screenshots

These captures use synthetic accounts and readings. The patient journal belongs to Samuel Alexander; the seeded doctor is Dr. Meera Shah. The CRUD sequence uses a separate synthetic patient account.

## Follow the working flow

The captures come from browser interactions with the running app. The add, edit, and delete screenshots follow the same account and date:

1. [Signup](signup.png) leads to an [empty journal](empty-report.png).
2. [Four saved readings](four-readings.png) show 110, 138, 129, and 124 mg/dl. The report shows count **4**, highest **138**, lowest **110**, and average **125.3**.
3. [Editing lunch](edit-form.png) changes 129 to 142 mg/dl. The [saved result](edited-reading.png) shows highest **142** and average **128.5**.
4. [Confirming dinner deletion](delete-confirmation.png) produces a [three-reading journal](deleted-reading.png), an available dinner slot, and average **130.0**.
5. The seeded account shows [daily readings](daily-desktop.png), [month-to-date totals](month-to-date.png), and the [entire previous month](previous-month.png), with a chart of the recorded values.

The validation section captures each of the assignment's five rules. The integration tests check password hashing, patient isolation, report calculations, cache invalidation, and doctor permissions; the screenshots show the visible UI states.

## Accounts and journal

| View | Screenshot |
| --- | --- |
| Login | [![Login](login.png)](login.png) |
| Signup with name, email, and password | [![Signup](signup.png)](signup.png) |
| Empty report and four available slots | [![Empty report](empty-report.png)](empty-report.png) |
| Daily journal with recorded and available slots | [![Daily journal](daily-desktop.png)](daily-desktop.png) |
| Four readings recorded in one day | [![Four readings](four-readings.png)](four-readings.png) |

## Add, edit, and delete

| Action | Screenshot |
| --- | --- |
| Add a date, slot, and glucose value | [![Reading form](reading-form.png)](reading-form.png) |
| Edit an existing reading | [![Edit form](edit-form.png)](edit-form.png) |
| Saved edit and updated report | [![Edited reading](edited-reading.png)](edited-reading.png) |
| Confirm deletion | [![Delete confirmation](delete-confirmation.png)](delete-confirmation.png) |
| Deleted reading and updated count | [![Deleted reading](deleted-reading.png)](deleted-reading.png) |

## Validation

| Rule | Screenshot |
| --- | --- |
| Required value | [![Required value](validation-desktop.png)](validation-desktop.png) |
| Whole number from 40 to 600 mg/dl | [![Value range](validation-range.png)](validation-range.png) |
| One reading per slot per day | [![Duplicate slot](validation-duplicate.png)](validation-duplicate.png) |
| Four readings per day | [![Daily limit](validation-limit.png)](validation-limit.png) |
| Date through today | [![Future date](validation-future.png)](validation-future.png) |

## Reports, history, and check-ins

| Feature | Screenshot |
| --- | --- |
| Month-to-date summary, reading list, and chart | [![Month to date](month-to-date.png)](month-to-date.png) |
| Entire previous-month report | [![Previous month](previous-month.png)](previous-month.png) |
| Reading history, page 1 | [![History page 1](history-page-1.png)](history-page-1.png) |
| Reading history, page 2 | [![History page 2](history-page-2.png)](history-page-2.png) |
| Check-in created by the BullMQ worker | [![Daily check-in](reminders.png)](reminders.png) |

## Doctor access and mobile

| View | Screenshot |
| --- | --- |
| Assigned-patient month-to-date report | [![Doctor reports](doctor-reports.png)](doctor-reports.png) |
| Assigned-patient daily readings | [![Doctor daily report](doctor-daily.png)](doctor-daily.png) |
| Mobile journal | [![Mobile journal](daily-mobile.png)](daily-mobile.png) |
| Mobile reading form | [![Mobile form](reading-form-mobile.png)](reading-form-mobile.png) |

The integration suite verifies Redis invalidation, doctor authorization, reminder scheduling, and persistent database constraints. The browser suite exercises the account, journal, pagination, and doctor flows. Run `npm run screenshots` to reproduce this set using the app URL in `APP_ORIGIN`.
