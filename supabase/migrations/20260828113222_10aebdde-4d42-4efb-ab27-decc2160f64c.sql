revoke all on function public.handle_new_user() from anon, authenticated, public;
revoke all on function public.has_role(uuid, public.app_role) from anon, public;
revoke all on function public.is_editor() from anon, public;
grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.is_editor() to authenticated;