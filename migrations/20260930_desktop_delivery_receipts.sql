-- Apply to the Smartinterview database, after round_notes/desktop_app migrations.
begin;
alter table public.round_notes drop constraint if exists round_notes_transcript_source_check;
alter table public.round_notes add constraint round_notes_transcript_source_check check(transcript_source in ('mic','graph_transcript','manual_upload','desktop_app'));
create table if not exists public.desktop_ingest_receipts(
  delivery_id text primary key, content_hash text not null,
  author_id uuid not null, interview_id uuid not null references public.interviews(id),
  session_id uuid not null, round text not null, revision bigint not null,
  payload jsonb not null, received_at timestamptz not null default now()
);
alter table public.desktop_ingest_receipts enable row level security;
revoke all on public.desktop_ingest_receipts from anon,authenticated;
alter table public.round_notes add column if not exists desktop_report jsonb;
alter table public.round_notes add column if not exists desktop_revision bigint not null default 0;

create or replace function public.ingest_desktop_delivery(
  p_delivery_id text,p_content_hash text,p_author_id uuid,p_interview_id uuid,p_round text,
  p_session_id uuid,p_revision bigint,p_payload jsonb,p_transcript jsonb,p_report jsonb,p_notes jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare existing public.desktop_ingest_receipts%rowtype;
begin
  if p_round not in ('interview','final_md') or p_delivery_id !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid delivery';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_interview_id::text || ':' || p_round,0));
  select * into existing from public.desktop_ingest_receipts where delivery_id=p_delivery_id;
  if found then
    if existing.content_hash<>p_content_hash or existing.author_id<>p_author_id then
      raise exception 'Delivery ID conflict';
    end if;
  else
    insert into public.desktop_ingest_receipts(delivery_id,content_hash,author_id,interview_id,session_id,round,revision,payload)
      values(p_delivery_id,p_content_hash,p_author_id,p_interview_id,p_session_id,p_round,p_revision,p_payload);
    insert into public.round_notes(interview_id,round,transcript_source,live_transcript,desktop_report,desktop_revision,ai_draft,hr_notes,submitted_at,submitted_by)
      values(p_interview_id,p_round,'desktop_app',p_transcript,p_report,p_revision,p_notes,p_notes,
        case when p_report is not null then now() end,case when p_report is not null then p_author_id::text end)
      on conflict(interview_id,round) do update set
        transcript_source='desktop_app',live_transcript=excluded.live_transcript,
        desktop_revision=excluded.desktop_revision,
        desktop_report=coalesce(excluded.desktop_report,round_notes.desktop_report),
        ai_draft=coalesce(excluded.ai_draft,round_notes.ai_draft),
        hr_notes=coalesce(excluded.hr_notes,round_notes.hr_notes),
        submitted_at=coalesce(excluded.submitted_at,round_notes.submitted_at),
        submitted_by=coalesce(excluded.submitted_by,round_notes.submitted_by)
      where excluded.desktop_revision>=round_notes.desktop_revision;
  end if;
  return jsonb_build_object('delivery_id',p_delivery_id,'persisted',true,'report_persisted',p_report is not null);
end; $$;
revoke all on function public.ingest_desktop_delivery(text,text,uuid,uuid,text,uuid,bigint,jsonb,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.ingest_desktop_delivery(text,text,uuid,uuid,text,uuid,bigint,jsonb,jsonb,jsonb,jsonb) to service_role;
commit;
