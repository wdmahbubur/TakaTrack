begin;
insert into public.categories (id, name_bn, name_en, type, icon, color, sort_order) values
('food', 'খাবার', 'Food', 'expense', 'utensils', 'amber', 1),
('groceries', 'বাজার', 'Groceries', 'expense', 'cart', 'green', 2),
('transport', 'যাতায়াত', 'Transport', 'expense', 'bus', 'blue', 3),
('bills', 'বিল', 'Bills', 'expense', 'receipt', 'rose', 4),
('entertainment', 'বিনোদন', 'Entertainment', 'expense', 'gamepad', 'purple', 5),
('other-expense', 'অন্যান্য', 'Other expenses', 'expense', 'more', 'slate', 6),
('salary', 'বেতন', 'Salary', 'income', 'income', 'green', 7),
('freelance', 'ফ্রিল্যান্স', 'Freelance', 'income', 'briefcase', 'blue', 8),
('other-income', 'অন্যান্য আয়', 'Other income', 'income', 'income', 'green', 9);
commit;
