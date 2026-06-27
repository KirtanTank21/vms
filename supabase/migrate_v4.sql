-- Add visitor-side push subscription support
alter table visitors add column if not exists push_subscription jsonb;
