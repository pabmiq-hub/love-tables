-- Asignar módulo social por defecto a organizadores que no tienen módulos
UPDATE organizers 
SET active_modules = ARRAY['social']
WHERE active_modules IS NULL OR active_modules = '{}';