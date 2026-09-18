-- Execute with an administrative database connection. Every created test user,
-- transaction, budget and quota record is ROLLED BACK. No existing data changes.
-- Ordinary operations below deliberately run as the authenticated/anon roles.
begin;
do $$
declare
  a uuid := gen_random_uuid(); b uuid := gen_random_uuid();
  req uuid := gen_random_uuid(); entry uuid := gen_random_uuid();
  other uuid := gen_random_uuid(); ids uuid[]; again uuid[];
  payload jsonb; snapshot jsonb; before_revision text; n integer; passed integer := 0;
begin
  insert into auth.users(id,email,aud,role,raw_user_meta_data)
    values(a,a::text||'@takatrack-test.invalid','authenticated','authenticated','{"display_name":"SQL Test A"}'),
          (b,b::text||'@takatrack-test.invalid','authenticated','authenticated','{"display_name":"SQL Test B"}');
  insert into public.transactions(id,user_id,type,title,amount_paisa,category_id,occurred_on,client_request_id)
    values(other,b,'expense','User B private record',77777,'food','2025-04-20',gen_random_uuid());
  insert into public.budgets(user_id,category_id,month,limit_paisa) values(b,'food','2025-04-01',80000);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  perform set_config('request.jwt.claim.sub',a::text,true);
  set local role authenticated;
  if (select count(*) from public.profiles)<>1 then raise exception 'profile read isolation'; end if; passed:=passed+1;
  update public.profiles set display_name='Other' where id=b;
  get diagnostics n=row_count; if n<>0 then raise exception 'cross-user profile update'; end if; passed:=passed+1;
  update public.profiles set display_name='Updated Test A' where id=a;
  if not found then raise exception 'own profile update'; end if; passed:=passed+1;
  if (select count(*) from public.categories)<>9 then raise exception 'seeded categories'; end if; passed:=passed+1;
  begin insert into public.categories(id,name_bn,name_en,type,icon,color,sort_order) values('injected','x','x','expense','x','x',99); raise exception 'category write permitted'; exception when insufficient_privilege then passed:=passed+1; end;
  if (select count(*) from public.transactions)<>0 then raise exception 'transaction read isolation'; end if; passed:=passed+1;
  if (select count(*) from public.budgets)<>0 then raise exception 'budget read isolation'; end if; passed:=passed+1;
  payload:=jsonb_build_array(jsonb_build_object('type','expense','title','Test food','amount_paisa',50000,'category_id','food','occurred_on','2025-04-21','note','','input_method','ai_text','client_request_id',entry,'user_id',b));
  ids:=public.save_transactions(req,payload);
  if (select user_id from public.transactions where id=ids[1])<>a then raise exception 'identity not derived from auth'; end if; passed:=passed+1;
  again:=public.save_transactions(req,payload);
  if again<>ids or (select count(*) from public.transactions)<>1 then raise exception 'retry duplicated records'; end if; passed:=passed+1;
  begin perform public.save_transactions(req,jsonb_set(payload,'{0,amount_paisa}','60000')); raise exception 'idempotency payload conflict accepted'; exception when invalid_parameter_value then passed:=passed+1; end;
  begin insert into public.transactions(user_id,type,title,amount_paisa,category_id,occurred_on,client_request_id) values(b,'expense','Impersonation',100,'food','2025-04-21',gen_random_uuid()); raise exception 'cross-user insert permitted'; exception when insufficient_privilege then passed:=passed+1; end;
  begin update public.transactions set user_id=b where id=ids[1]; raise exception 'ownership transfer permitted'; exception when insufficient_privilege then passed:=passed+1; end;
  update public.transactions set title='Cross user edit' where id=other; get diagnostics n=row_count;
  if n<>0 then raise exception 'cross-user update'; end if; passed:=passed+1;
  delete from public.transactions where id=other; get diagnostics n=row_count;
  if n<>0 then raise exception 'cross-user delete'; end if; passed:=passed+1;
  snapshot:=public.month_snapshot('2025-04-01'); before_revision:=snapshot->>'revision';
  if (snapshot->>'expense')::bigint<>50000 or (snapshot->>'count')::int<>1 then raise exception 'cross-user aggregate leakage'; end if; passed:=passed+1;
  update public.transactions set amount_paisa=60000 where id=ids[1];
  snapshot:=public.month_snapshot('2025-04-01');
  if snapshot->>'revision'=before_revision or (snapshot->>'expense')::bigint<>60000 then raise exception 'summary revision not invalidated'; end if; passed:=passed+1;
  begin perform public.save_transactions(gen_random_uuid(),jsonb_build_array(jsonb_build_object('type','expense','title','Atomic first','amount_paisa',100,'category_id','food','occurred_on','2025-04-21','input_method','ai_voice','client_request_id',gen_random_uuid()),jsonb_build_object('type','income','title','Atomic invalid','amount_paisa',100,'category_id','food','occurred_on','2025-04-21','input_method','ai_voice','client_request_id',gen_random_uuid()))); raise exception 'invalid batch accepted'; exception when foreign_key_violation then if (select count(*) from public.transactions)<>1 then raise exception 'partial batch committed'; end if; passed:=passed+1; end;
  begin perform public.save_transactions(gen_random_uuid(),jsonb_set(payload,'{0,amount_paisa}','12.5')); raise exception 'fractional paisa accepted'; exception when invalid_parameter_value then passed:=passed+1; end;
  begin perform public.save_transactions(gen_random_uuid(),jsonb_set(jsonb_set(payload,'{0,amount_paisa}','0'),'{0,client_request_id}',to_jsonb(gen_random_uuid()))); raise exception 'zero accepted'; exception when check_violation then passed:=passed+1; end;
  begin perform public.save_transactions(gen_random_uuid(),'[]'); raise exception 'empty batch accepted'; exception when invalid_parameter_value then passed:=passed+1; end;
  insert into public.budgets(user_id,category_id,month,limit_paisa) values(a,'food','2025-04-01',50000);
  snapshot:=public.month_snapshot('2025-04-01');
  if jsonb_array_length(snapshot->'budgets')<>1 or (snapshot->'budgets'->0->>'limit_paisa')::bigint<>50000 then raise exception 'budget snapshot isolation'; end if; passed:=passed+1;
  begin insert into public.budgets(user_id,category_id,month,limit_paisa) values(a,'food','2025-04-01',100); raise exception 'duplicate budget'; exception when unique_violation then passed:=passed+1; end;
  begin insert into public.budgets(user_id,category_id,month,limit_paisa) values(a,'salary','2025-04-01',100); raise exception 'income budget'; exception when foreign_key_violation then passed:=passed+1; end;
  begin insert into public.budgets(user_id,category_id,month,limit_paisa) values(a,'food','2025-05-02',100); raise exception 'non-month date'; exception when check_violation then passed:=passed+1; end;
  begin insert into public.budgets(user_id,category_id,month,limit_paisa) values(b,'food','2025-05-01',100); raise exception 'cross-user budget'; exception when insufficient_privilege then passed:=passed+1; end;
  update public.budgets set limit_paisa=100 where user_id=b; get diagnostics n=row_count;
  if n<>0 then raise exception 'cross-user budget edit'; end if; passed:=passed+1;
  delete from public.budgets where user_id=b; get diagnostics n=row_count;
  if n<>0 then raise exception 'cross-user budget delete'; end if; passed:=passed+1;
  insert into public.transactions(user_id,type,title,amount_paisa,category_id,occurred_on,client_request_id)
    select a,'expense','Aggregation limit test',1,'food','2026-01-01',gen_random_uuid() from generate_series(1,1001);
  snapshot:=public.month_snapshot('2026-01-01');
  if (snapshot->>'count')::int<>1001 or (snapshot->>'expense')::bigint<>1001 then raise exception 'aggregate limited to API page'; end if; passed:=passed+1;
  if (public.month_snapshot('2025-04-01','2025-04-20')->>'expense')::bigint<>0 then raise exception 'comparison boundary'; end if; passed:=passed+1;
  for n in 1..8 loop if not public.consume_ai_quota('extract') then raise exception 'quota premature'; end if; end loop;
  if public.consume_ai_quota('extract') then raise exception 'quota did not limit'; end if; passed:=passed+1;
  begin perform count(*) from takatrack_private.ai_rate_windows; raise exception 'private quota table readable'; exception when insufficient_privilege then passed:=passed+1; end;
  delete from public.transactions where id=ids[1];
  if public.save_transactions(req,payload)<>ids or exists(select 1 from public.transactions where id=ids[1]) then raise exception 'retry resurrected deletion'; end if; passed:=passed+1;
  reset role;
  perform set_config('request.jwt.claims','{}',true); perform set_config('request.jwt.claim.sub','',true);
  set local role authenticated;
  if (select count(*) from public.transactions)<>0 then raise exception 'empty session read'; end if; passed:=passed+1;
  begin perform public.month_snapshot('2025-04-01'); raise exception 'empty session aggregate'; exception when insufficient_privilege then passed:=passed+1; end;
  reset role; set local role anon;
  begin perform count(*) from public.transactions; raise exception 'anon read'; exception when insufficient_privilege then passed:=passed+1; end;
  begin perform public.save_transactions(req,payload); raise exception 'anon mutation'; exception when insufficient_privilege then passed:=passed+1; end;
  reset role;
  if (select title from public.transactions where id=other)<>'User B private record' then raise exception 'User B changed'; end if; passed:=passed+1;
  perform set_config('takatrack.test_report',jsonb_build_object('passed',passed,'failed',0,'mode','real PostgreSQL roles and RLS; all test data rolled back')::text,true);
end $$;
select current_setting('takatrack.test_report')::jsonb as security_test_results;
rollback;
