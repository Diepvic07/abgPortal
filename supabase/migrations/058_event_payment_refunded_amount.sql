-- Track how much was actually refunded so admins can log partial refunds
-- and preserve the original paid amount for audit.
--
-- Semantics:
--   NULL              — payment has not been refunded (or was refunded before
--                       this column existed; treat as full refund of amount_vnd).
--   0..amount_vnd     — actual VND returned to the payer. The kept portion
--                       (amount_vnd - refunded_amount_vnd) still counts as
--                       event revenue.
--
-- Only meaningful for rows with status = 'refunded'.

alter table event_payments
  add column if not exists refunded_amount_vnd integer;

alter table event_payments
  drop constraint if exists event_payments_refunded_amount_check;

alter table event_payments
  add constraint event_payments_refunded_amount_check
  check (refunded_amount_vnd is null or (refunded_amount_vnd >= 0 and refunded_amount_vnd <= amount_vnd));
