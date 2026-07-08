-- Extend event_payments.status to support admin-managed cancellation and refunds.
--
-- New statuses:
--   'cancelled_no_refund' — participant cancelled but the money stays with us
--                            (still counts toward event revenue; kept on the list
--                            with a badge so admins can track it and later flip
--                            it to refunded if they actually pay it back).
--   'refunded'            — money was returned to the participant; excluded from
--                            revenue totals and hidden from the active list.

alter table event_payments
  drop constraint if exists event_payments_status_check;

alter table event_payments
  add constraint event_payments_status_check
  check (status in ('pending', 'confirmed', 'rejected', 'cancelled_no_refund', 'refunded'));

alter table event_payments
  add column if not exists cancellation_note text;
