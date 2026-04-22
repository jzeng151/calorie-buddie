CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  calories_per_serving INTEGER NOT NULL,
  meal_type TEXT NOT NULL DEFAULT 'snack'
    CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  emoji TEXT NOT NULL DEFAULT '🍽️',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view recipes"
  ON public.recipes FOR SELECT
  USING (true);

-- Seed data
INSERT INTO public.recipes (name, description, calories_per_serving, meal_type, emoji) VALUES
  ('Avocado Toast',       'Wholegrain toast with smashed avocado and chilli flakes', 320,  'breakfast', '🥑'),
  ('Greek Yoghurt Bowl',  'Full-fat yoghurt with granola, honey and mixed berries',  380,  'breakfast', '🫐'),
  ('Scrambled Eggs',      'Two eggs scrambled with butter on sourdough',              410,  'breakfast', '🍳'),
  ('Overnight Oats',      'Rolled oats soaked in milk with banana and nut butter',   450,  'breakfast', '🌾'),
  ('Banana Smoothie',     'Banana, oat milk, peanut butter and a handful of spinach',280,  'breakfast', '🍌'),

  ('Grilled Chicken Salad','Chicken breast, mixed greens, cherry tomatoes, olive oil',390,  'lunch',     '🥗'),
  ('Tuna Wrap',           'Tuna, sweetcorn, mayo and rocket in a wholemeal wrap',    430,  'lunch',     '🌯'),
  ('Lentil Soup',         'Red lentils simmered with cumin, tomato and lemon',       310,  'lunch',     '🍲'),
  ('Caprese Panini',      'Fresh mozzarella, tomato and basil in a ciabatta roll',   480,  'lunch',     '🥪'),
  ('Veggie Buddha Bowl',  'Brown rice, roasted veg, hummus and sesame dressing',     520,  'lunch',     '🍚'),

  ('Salmon & Veg',        'Pan-seared salmon fillet with roasted broccoli and sweet potato',560,'dinner','🐟'),
  ('Pasta Bolognese',     'Lean beef mince with a rich tomato sauce on spaghetti',   650,  'dinner',    '🍝'),
  ('Chicken Stir Fry',    'Chicken thigh strips with peppers, sugar snap and soy',   490,  'dinner',    '🥘'),
  ('Beef Tacos',          'Spiced minced beef in two corn tortillas with salsa',      540,  'dinner',    '🌮'),
  ('Vegetable Curry',     'Mixed veg in a coconut and tomato curry with basmati',    480,  'dinner',    '🍛'),

  ('Handful of Almonds',  'About 23 raw almonds',                                    160,  'snack',     '🌰'),
  ('Apple & Peanut Butter','One medium apple with two tablespoons of peanut butter', 220,  'snack',     '🍎'),
  ('Rice Cakes',          'Two plain rice cakes with a little cream cheese',         130,  'snack',     '🍘'),
  ('Protein Bar',         'A standard 60 g protein bar',                             240,  'snack',     '🍫'),
  ('Hummus & Veg Sticks', 'Four tablespoons of hummus with carrot and cucumber sticks',180,'snack',    '🥕');
