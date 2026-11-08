# Sweety visual system

## Direction

A personal daily journal, using the orderly rows and clear period controls of Lovable's dashboard references. The four meal slots are the signature: a stable reading order, familiar meal icons, recorded values, and an explicit place to add missing readings. It is an operating interface rather than a marketing page.

## Palette and type

Charcoal `#282b26` for text, neutral gray `#62665d` for secondary text, white `#ffffff` for navigation and reading rows, and near-white `#f7f7f5` for the canvas. Forest green `#315b3d` identifies actions and selection; `#527346` draws the single chart series. Red remains reserved for errors and deletion. Green does not classify glucose values as healthy or unhealthy. Manrope headings and numbers, Nunito Sans body text; fonts are self-hosted via npm.

The palette is deliberately restrained. Reports sit directly on the neutral canvas, separated by rules, rather than large colored statistic cards. The reading log is the primary enclosed surface. Role-based CSS tokens own colors across authentication, navigation, reports, and forms.

## Composition and states

Desktop: a 224px white navigation rail, date and period controls, report summary, daily rows, and a true-data trend. The outer rail stretches with the entire page; its inner navigation stays sticky within the viewport. This keeps the rail continuous in full-page screenshots while leaving the account controls accessible during scrolling. Brand placement aligns with the top bar. Mobile: top navigation, two-column statistics, and the same four rows. Forms are inline and keep the selected date. Delete confirmation appears next to the affected reading. Errors, loading, empty reports, session expiry, and successful changes have explicit text.

Patients also have paginated history and daily check-in views. Doctor navigation leads to assigned-patient reports with a patient selector. Monthly charts plot each recorded value in meal-slot order. Mobile navigation uses two columns to keep all patient destinations visible.

## Reference

https://lovable.dev/templates/apps/internal-tools/customer-health-dashboard-template

The reference informs dashboard hierarchy and period navigation. Sweety's code, assets, branding, and meal-slot interaction are original. No clinical target bands or diagnostic labels are inferred from recorded values.
