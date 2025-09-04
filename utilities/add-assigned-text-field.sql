-- Script SQL para agregar el campo assigned_text a la tabla tasks
-- Este campo permite a usuarios sin departamento asignar tareas usando texto libre

-- Agregar la columna assigned_text a la tabla tasks
ALTER TABLE tasks 
ADD COLUMN assigned_text TEXT;

-- Agregar comentario para documentar el propósito del campo
COMMENT ON COLUMN tasks.assigned_text IS 'Campo de texto libre para asignación de tareas por usuarios sin departamento';

-- Crear índice para mejorar el rendimiento de las consultas de filtrado
CREATE INDEX idx_tasks_assigned_text ON tasks(assigned_text) WHERE assigned_text IS NOT NULL;

-- Verificar que la columna se agregó correctamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' AND column_name = 'assigned_text';
