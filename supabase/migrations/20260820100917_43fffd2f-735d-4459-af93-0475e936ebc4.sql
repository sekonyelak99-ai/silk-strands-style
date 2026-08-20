
-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  hair_type TEXT,
  skin_tone TEXT,
  preferred_currency TEXT NOT NULL DEFAULT 'USD',
  shipping_address JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PRODUCTS
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  tagline TEXT,
  description TEXT NOT NULL,
  price_usd NUMERIC(10,2) NOT NULL,
  image_url TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  stock INT NOT NULL DEFAULT 25,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon, authenticated USING (true);

-- REVIEWS
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reviews public read" ON public.reviews FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "reviews own write" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own update" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews own delete" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CART
CREATE TABLE public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cart_items TO authenticated;
GRANT ALL ON public.cart_items TO service_role;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cart" ON public.cart_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- WISHLIST
CREATE TABLE public.wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlist" ON public.wishlist_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ORDERS
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  order_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  total_usd NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  display_total NUMERIC(12,2) NOT NULL,
  email TEXT NOT NULL,
  shipping_address JSONB,
  share_token TEXT UNIQUE,
  paid_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, UPDATE ON public.orders TO anon;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own orders read" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own orders insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own orders update" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "shared order read" ON public.orders FOR SELECT TO anon USING (share_token IS NOT NULL);
CREATE POLICY "shared order pay" ON public.orders FOR UPDATE TO anon USING (share_token IS NOT NULL AND status = 'awaiting_payment') WITH CHECK (share_token IS NOT NULL);
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products ON DELETE RESTRICT,
  product_name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  unit_price_usd NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL
);
GRANT SELECT, INSERT ON public.order_items TO authenticated;
GRANT SELECT ON public.order_items TO anon;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order items read" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order items shared read" ON public.order_items FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.share_token IS NOT NULL));
CREATE POLICY "order items insert" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- ORDER EVENTS (tracking timeline)
CREATE TABLE public.order_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  status TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_events TO authenticated;
GRANT SELECT ON public.order_events TO anon;
GRANT ALL ON public.order_events TO service_role;
ALTER TABLE public.order_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order events read" ON public.order_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));
CREATE POLICY "order events shared read" ON public.order_events FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.share_token IS NOT NULL));
CREATE POLICY "order events insert" ON public.order_events FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid()));

-- EMAIL LOG (smart email generator output)
CREATE TABLE public.order_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.order_emails TO authenticated;
GRANT ALL ON public.order_emails TO service_role;
ALTER TABLE public.order_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own emails read" ON public.order_emails FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own emails insert" ON public.order_emails FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- SEED CATALOG
INSERT INTO public.products (slug, name, category, tagline, description, price_usd, image_url, tags, featured) VALUES
('burmese-raw-wave','Burmese Raw Wave Bundle','Raw Bundles','Single-donor raw texture','Ethically sourced single-donor raw Burmese hair with a soft, low-lustre wave that blends effortlessly with blown-out 4A–4C textures. Wears up to three years with care.',320.00,'/images/products/burmese-raw-wave.jpg','{"bundles","wave","raw","long-lasting"}',true),
('hd-invisible-frontal','HD Invisible Frontal Wig','Lace Systems','Melts on every complexion','A 13x6 HD lace frontal pre-tinted across a spectrum of deep, rich complexions so the knots disappear. Hand-tied with a bleached, glueless install option.',550.00,'/images/products/hd-invisible-frontal.jpg','{"wig","lace","frontal","glueless"}',true),
('nectar-scalp-elixir','Nectar Scalp Elixir','Botanical Care','Weightless growth oil','A featherlight blend of baobab, chebe and rosemary that soothes tension-prone edges and feeds the scalp without weighing down protective styles.',64.00,'/images/products/nectar-scalp-elixir.jpg','{"haircare","scalp","growth","edges","oil"}',true),
('midnight-curl-souffle','Midnight Curl Soufflé','Botanical Care','Definition without crunch','Whipped shea and flaxseed soufflé that clumps coils, holds a wash-and-go for five days and never flakes.',38.00,'/images/products/midnight-curl-souffle.jpg','{"haircare","curls","4c","definition"}',false),
('silk-press-serum','Silk Press Heat Serum','Botanical Care','450°F thermal shield','A silicone-light thermal serum that guards strands through a silk press and keeps the finish glass-smooth in humidity.',42.00,'/images/products/silk-press-serum.jpg','{"haircare","heat","silk press","serum"}',false),
('cocoa-glow-body-oil','Cocoa Glow Body Oil','Melanin Care','Lit-from-within sheen','Cold-pressed cocoa, marula and rice bran oil that leaves deep skin luminous rather than ashy — absorbs in seconds.',48.00,'/images/products/cocoa-glow-body-oil.jpg','{"skincare","body","glow","dry skin"}',true),
('melanin-radiance-serum','Melanin Radiance Serum','Melanin Care','Fades dark marks','A 12% niacinamide and tranexamic acid serum formulated for hyperpigmentation and post-acne marks on rich skin tones.',78.00,'/images/products/melanin-radiance-serum.jpg','{"skincare","hyperpigmentation","dark spots","serum"}',true),
('amber-cleansing-balm','Amber Shea Cleansing Balm','Melanin Care','Melts makeup, keeps moisture','A shea and amber balm that dissolves long-wear foundation and sunscreen without stripping the barrier.',44.00,'/images/products/amber-cleansing-balm.jpg','{"skincare","cleanser","balm","makeup"}',false),
('cloud-satin-bonnet','Cloud Satin Bonnet','Silk Goods','Sleeps in, stays on','A double-lined mulberry silk bonnet with a soft band that protects braids, silk presses and wigs all night.',28.00,'/images/products/cloud-satin-bonnet.jpg','{"accessories","bonnet","silk","protective"}',false),
('silk-pillowcase-set','Mulberry Silk Pillowcase Set','Silk Goods','22-momme, breakage-free','A pair of 22-momme mulberry silk pillowcases that cut friction, frizz and breakage while you sleep.',96.00,'/images/products/silk-pillowcase-set.jpg','{"accessories","silk","pillowcase","frizz"}',false),
('kinky-straight-closure','Kinky Straight 5x5 Closure','Lace Systems','Blends with relaxed roots','A 5x5 HD closure with a kinky-straight texture cut to match blown-out natural hair for a seamless leave-out-free install.',280.00,'/images/products/kinky-straight-closure.jpg','{"closure","kinky straight","lace","natural"}',false),
('deep-wave-trio','Deep Wave Bundle Trio','Raw Bundles','Three bundles, one install','Three raw deep wave bundles in graduated lengths for a full, voluminous install with pattern that returns after every wash.',420.00,'/images/products/deep-wave-trio.jpg','{"bundles","deep wave","trio","volume"}',true);
