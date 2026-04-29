-- 026_companion_rule_suggestions.sql
--
-- Adds is_suggestion to product_companion_rules.
-- Rules tagged is_suggestion=true are routed to a separate suggestions[]
-- bucket in the bom-calculator response instead of lines[].
-- Default false preserves existing hard-companion behaviour.

ALTER TABLE product_companion_rules
  ADD COLUMN is_suggestion boolean NOT NULL DEFAULT false;
