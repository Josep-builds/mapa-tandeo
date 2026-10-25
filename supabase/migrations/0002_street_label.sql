-- Adds an invented, labeled-simulated street name per block ("Calle 5 entre
-- Av. Tláhuac y Calle 7") so residents can recognize their block without any
-- household-level address data — see DECISIONS.md for the privacy rationale.
alter table blocks add column street_label text not null default '';
