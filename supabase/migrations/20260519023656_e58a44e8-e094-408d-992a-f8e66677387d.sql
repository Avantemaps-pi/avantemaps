
create unique index if not exists message_fees_payment_id_uidx
  on public.message_fees (payment_id);
