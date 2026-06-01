# Event Mode Webinar Default

## Summary

Make admin-created Webinar events default to online mode so public event pages show `Truc tuyen` instead of `Truc tiep` when the event category is Webinar.

## Problem

- Admin-created events can be assigned category `webinar`.
- The admin event create/edit form does not expose the event mode field.
- The create API defaults missing `event_mode` to `offline`.
- The Supabase event insert helper also defaults missing `event_mode` to `offline`.
- The public/member event detail page correctly displays the saved mode, so an online Webinar can appear as `Truc tiep`.

Confirmed production example:

- URL: `https://www.abgalumni.vn/events/tao-mot-website-hoan-chinh-trong-30-phut-cung-ai`
- Event ID: `9d8abe9c-d17b-4e02-bdc7-23b5ce2abf0e`
- Public API shows `category: "webinar"`, `event_mode: "offline"`, `location: "Truc tuyen qua Zoom"`.

## Goal

- Selecting category `Webinar` in the admin event form should automatically default `Hinh thuc` / event mode to online.
- The saved event row should have `event_mode: "online"` for new Webinar events unless an admin explicitly chooses another valid mode.
- Admins should be able to see and change the event mode during event creation/editing.

## Scope

- Update the admin event form in `components/admin/admin-event-manager.tsx`.
- Include `event_mode` in create/edit form state and submitted payload.
- Add a visible event mode selector using the existing mode values:
  - `offline`
  - `online`
  - `hybrid`
- When category changes to `webinar`, auto-select `online`.
- Preserve existing category, location, location URL, RSVP, payment, and publication behavior.
- Do not change event detail display logic except if required to consume existing labels consistently.

## Non-Goals

- Do not add new event mode values.
- Do not add a database migration unless investigation shows the deployed schema is missing `event_mode`.
- Do not infer meeting platform from free-text location.
- Do not bulk-update all historical Webinar events without explicit approval.
- Proposal-to-event conversion is in scope: default the event mode from the proposal participation format when available.

## Target Users

- Admins creating and editing community events.
- Members and visitors viewing event detail pages.

## Functional Requirements

- Admin create form must include a `Hinh thuc` / `Mode` selector.
- Admin edit form must load the existing saved `event_mode`.
- Admin save must send `event_mode` to the create/update API.
- Creating a new event with category `webinar` must default event mode to `online`.
- Changing category to `webinar` in the form must set event mode to `online`.
- The admin may still choose `offline` or `hybrid` after selecting `webinar` if needed.
- Non-Webinar categories should retain the current default mode unless the admin changes it.
- Existing events should not have their mode changed merely by opening the edit form.
- Proposal-to-event conversion should default the event mode from `proposal.participation_format` when it is `online`, `offline`, or `hybrid`.
- Proposal-to-event conversion should still allow admins to override the default event mode before creating the event.

## Acceptance Criteria

- [ ] In `/admin`, a new event created as category `Webinar` saves with `event_mode: "online"`.
- [ ] The event detail page displays `Truc tuyen` for that newly created Webinar.
- [ ] Editing an existing event shows its current mode.
- [ ] Editing an event can change mode between offline, online, and hybrid.
- [ ] The reported event can be corrected to online through the admin edit flow after the fix deploys.
- [ ] Non-Webinar event creation still works and defaults to the existing offline behavior.
- [ ] Converting an online proposal into an event defaults the event mode to online.
- [ ] Converting an offline or hybrid proposal into an event defaults the event mode to that proposal format.

## Data / Backend Impact

- Expected database schema impact: none, because `event_mode` already exists in migrations and API types.
- Create/update API already accepts `event_mode`; primary issue is admin UI omission.
- A direct authenticated production row update is required for the reported event after code implementation.

## Validation Constraints

- Local full-app validation is not the default path for this project.
- Prefer GitHub/Vercel preview or production validation after PR merge.
- If local lint/typecheck is desired, ask first and stop quickly if Node tooling stalls.

## Decisions

- Cover both `/admin` event manager and proposal-to-event conversion.
- Update the existing production event row directly so the reported event displays online mode immediately.
