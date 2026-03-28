-- Seed moveable Brazilian holidays (Easter-dependent) for 2000-2030
-- into pjecalc_feriados.
--
-- Moveable holidays are calculated relative to Easter Sunday:
--   Carnaval (terça-feira de Carnaval) = Easter - 47 days
--   Sexta-feira Santa (Good Friday)    = Easter - 2 days
--   Corpus Christi                     = Easter + 60 days
--
-- Easter dates used: standard Computus algorithm results for each year.

INSERT INTO public.pjecalc_feriados (data, nome, scope) VALUES
-- 2000 (Easter: Apr 23)
('2000-03-07','Carnaval','nacional'),
('2000-04-21','Sexta-feira Santa','nacional'),
('2000-06-22','Corpus Christi','nacional'),
-- 2001 (Easter: Apr 15)
('2001-02-27','Carnaval','nacional'),
('2001-04-13','Sexta-feira Santa','nacional'),
('2001-06-14','Corpus Christi','nacional'),
-- 2002 (Easter: Mar 31)
('2002-02-12','Carnaval','nacional'),
('2002-03-29','Sexta-feira Santa','nacional'),
('2002-05-30','Corpus Christi','nacional'),
-- 2003 (Easter: Apr 20)
('2003-03-04','Carnaval','nacional'),
('2003-04-18','Sexta-feira Santa','nacional'),
('2003-06-19','Corpus Christi','nacional'),
-- 2004 (Easter: Apr 11)
('2004-02-24','Carnaval','nacional'),
('2004-04-09','Sexta-feira Santa','nacional'),
('2004-06-10','Corpus Christi','nacional'),
-- 2005 (Easter: Mar 27)
('2005-02-08','Carnaval','nacional'),
('2005-03-25','Sexta-feira Santa','nacional'),
('2005-05-26','Corpus Christi','nacional'),
-- 2006 (Easter: Apr 16)
('2006-02-28','Carnaval','nacional'),
('2006-04-14','Sexta-feira Santa','nacional'),
('2006-06-15','Corpus Christi','nacional'),
-- 2007 (Easter: Apr 8)
('2007-02-20','Carnaval','nacional'),
('2007-04-06','Sexta-feira Santa','nacional'),
('2007-06-07','Corpus Christi','nacional'),
-- 2008 (Easter: Mar 23)
('2008-02-05','Carnaval','nacional'),
('2008-03-21','Sexta-feira Santa','nacional'),
('2008-05-22','Corpus Christi','nacional'),
-- 2009 (Easter: Apr 12)
('2009-02-24','Carnaval','nacional'),
('2009-04-10','Sexta-feira Santa','nacional'),
('2009-06-11','Corpus Christi','nacional'),
-- 2010 (Easter: Apr 4)
('2010-02-16','Carnaval','nacional'),
('2010-04-02','Sexta-feira Santa','nacional'),
('2010-06-03','Corpus Christi','nacional'),
-- 2011 (Easter: Apr 24)
('2011-03-08','Carnaval','nacional'),
('2011-04-22','Sexta-feira Santa','nacional'),
('2011-06-23','Corpus Christi','nacional'),
-- 2012 (Easter: Apr 8)
('2012-02-21','Carnaval','nacional'),
('2012-04-06','Sexta-feira Santa','nacional'),
('2012-06-07','Corpus Christi','nacional'),
-- 2013 (Easter: Mar 31)
('2013-02-12','Carnaval','nacional'),
('2013-03-29','Sexta-feira Santa','nacional'),
('2013-05-30','Corpus Christi','nacional'),
-- 2014 (Easter: Apr 20)
('2014-03-04','Carnaval','nacional'),
('2014-04-18','Sexta-feira Santa','nacional'),
('2014-06-19','Corpus Christi','nacional'),
-- 2015 (Easter: Apr 5)
('2015-02-17','Carnaval','nacional'),
('2015-04-03','Sexta-feira Santa','nacional'),
('2015-06-04','Corpus Christi','nacional'),
-- 2016 (Easter: Mar 27)
('2016-02-09','Carnaval','nacional'),
('2016-03-25','Sexta-feira Santa','nacional'),
('2016-05-26','Corpus Christi','nacional'),
-- 2017 (Easter: Apr 16)
('2017-02-28','Carnaval','nacional'),
('2017-04-14','Sexta-feira Santa','nacional'),
('2017-06-15','Corpus Christi','nacional'),
-- 2018 (Easter: Apr 1)
('2018-02-13','Carnaval','nacional'),
('2018-03-30','Sexta-feira Santa','nacional'),
('2018-05-31','Corpus Christi','nacional'),
-- 2019 (Easter: Apr 21)
('2019-03-05','Carnaval','nacional'),
('2019-04-19','Sexta-feira Santa','nacional'),
('2019-06-20','Corpus Christi','nacional'),
-- 2020 (Easter: Apr 12)
('2020-02-25','Carnaval','nacional'),
('2020-04-10','Sexta-feira Santa','nacional'),
('2020-06-11','Corpus Christi','nacional'),
-- 2021 (Easter: Apr 4)
('2021-02-16','Carnaval','nacional'),
('2021-04-02','Sexta-feira Santa','nacional'),
('2021-06-03','Corpus Christi','nacional'),
-- 2022 (Easter: Apr 17)
('2022-03-01','Carnaval','nacional'),
('2022-04-15','Sexta-feira Santa','nacional'),
('2022-06-16','Corpus Christi','nacional'),
-- 2023 (Easter: Apr 9)
('2023-02-21','Carnaval','nacional'),
('2023-04-07','Sexta-feira Santa','nacional'),
('2023-06-08','Corpus Christi','nacional'),
-- 2024 (Easter: Mar 31)
('2024-02-13','Carnaval','nacional'),
('2024-03-29','Sexta-feira Santa','nacional'),
('2024-05-30','Corpus Christi','nacional'),
-- 2025 (Easter: Apr 20)
('2025-03-04','Carnaval','nacional'),
('2025-04-18','Sexta-feira Santa','nacional'),
('2025-06-19','Corpus Christi','nacional'),
-- 2026 (Easter: Apr 5)
('2026-02-17','Carnaval','nacional'),
('2026-04-03','Sexta-feira Santa','nacional'),
('2026-06-04','Corpus Christi','nacional'),
-- 2027 (Easter: Mar 28)
('2027-02-09','Carnaval','nacional'),
('2027-03-26','Sexta-feira Santa','nacional'),
('2027-05-27','Corpus Christi','nacional'),
-- 2028 (Easter: Apr 16)
('2028-02-29','Carnaval','nacional'),
('2028-04-14','Sexta-feira Santa','nacional'),
('2028-06-15','Corpus Christi','nacional'),
-- 2029 (Easter: Apr 1)
('2029-02-13','Carnaval','nacional'),
('2029-03-30','Sexta-feira Santa','nacional'),
('2029-05-31','Corpus Christi','nacional'),
-- 2030 (Easter: Apr 21)
('2030-03-05','Carnaval','nacional'),
('2030-04-19','Sexta-feira Santa','nacional'),
('2030-06-20','Corpus Christi','nacional')
ON CONFLICT DO NOTHING;
