-- notes 表的 RLS 策略
ALTER TABLE "public"."notes" ENABLE ROW LEVEL SECURITY;

-- 允许公开读取
CREATE POLICY "Enable read for all" ON "public"."notes" FOR SELECT TO public USING (true);

-- 允许插入（服务器用 service_role 绕过后，这个策略其实不需要，但保险起见加上）
CREATE POLICY "Enable insert for all" ON "public"."notes" FOR INSERT TO public WITH CHECK (true);