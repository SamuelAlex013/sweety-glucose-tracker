# Sweety visual system

## Direction

A daily journal organized around the four meal slots. Each row shows its recorded value or an Add button. The report controls and table layout follow Lovable's dashboard reference.

## Palette and type

Charcoal `#282b26` for text, gray `#62665d` for secondary text, white `#ffffff` for navigation and reading rows, and `#f7f7f5` for the page background. Forest green `#315b3d` marks actions and selection; `#527346` draws the chart. Red marks errors and deletion. Glucose values use neutral text. Manrope is used for headings and numbers, Nunito Sans for body text. Both fonts are self-hosted through npm packages.

Report statistics sit on the page background, separated by rules. Reading rows and forms have white backgrounds and thin borders. Shared CSS variables define colors across login, navigation, reports, and forms.

## Composition and states

Desktop uses a 224px white sidebar. The sidebar spans the page height, with account details and logout at its bottom. The journal contains date and period controls, a report summary, daily rows, and a chart of recorded readings. Mobile uses top navigation and two-column statistics. Forms open inline with the selected date. Delete confirmation appears beside the affected reading. Errors, loading, empty reports, session expiry, and successful changes have text feedback.

Patients also have paginated history and daily check-in views. Doctor navigation leads to assigned-patient reports with a patient selector. Monthly charts plot each recorded value in meal-slot order. Mobile navigation uses two columns to keep all patient destinations visible.

## Reference

https://lovable.dev/templates/apps/internal-tools/customer-health-dashboard-template

The reference informed report placement and period navigation. Sweety uses its own branding, components, and meal-slot controls. Reports show recorded values and arithmetic summaries.
