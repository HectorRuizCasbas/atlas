-- Tabla tasks para el sistema Atlas
-- Contiene todas las tareas del sistema con historial de cambios

CREATE TABLE public.tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo text NOT NULL,
  descripcion text,
  creador uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  asignado_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prioridad text NOT NULL DEFAULT 'Media',
  estado text NOT NULL DEFAULT 'Sin iniciar',
  privada boolean NOT NULL DEFAULT false,
  departamento text, -- Campo para funcionalidad futura
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Constraints para validar valores permitidos
  CONSTRAINT tasks_prioridad_check CHECK (
    prioridad IN ('Baja', 'Media', 'Alta', 'Urgente')
  ),
  CONSTRAINT tasks_estado_check CHECK (
    estado IN ('Sin iniciar', 'En progreso', 'En espera', 'Finalizada')
  ),
  -- Constraint para validar que solo el creador puede hacer privada una tarea asignada a sí mismo
  CONSTRAINT tasks_privada_check CHECK (
    (privada = false) OR (privada = true AND creador = asignado_a)
  )
) TABLESPACE pg_default;

-- Índices para mejorar rendimiento
CREATE INDEX idx_tasks_creador ON public.tasks(creador);
CREATE INDEX idx_tasks_asignado_a ON public.tasks(asignado_a);
CREATE INDEX idx_tasks_estado ON public.tasks(estado);
CREATE INDEX idx_tasks_prioridad ON public.tasks(prioridad);
CREATE INDEX idx_tasks_updated_at ON public.tasks(updated_at);

-- Tabla para el historial de cambios de las tareas
CREATE TABLE public.task_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campo_modificado text NOT NULL, -- Nombre del campo que cambió
  valor_anterior text, -- Valor anterior (JSON string si es necesario)
  valor_nuevo text, -- Valor nuevo (JSON string si es necesario)
  comentario text, -- Comentario opcional del usuario sobre el cambio
  created_at timestamp with time zone DEFAULT now() NOT NULL
) TABLESPACE pg_default;

-- Índices para el historial
CREATE INDEX idx_task_history_task_id ON public.task_history(task_id);
CREATE INDEX idx_task_history_created_at ON public.task_history(task_id, created_at);

-- Función para actualizar automáticamente updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON public.tasks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Función para crear entradas automáticas en el historial
CREATE OR REPLACE FUNCTION log_task_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id uuid;
BEGIN
    -- Obtener el ID del usuario actual (esto se puede mejorar con RLS)
    -- Por ahora usamos el creador como fallback
    current_user_id := COALESCE(auth.uid(), NEW.creador);
    
    -- Solo registrar cambios en UPDATE, no en INSERT
    IF TG_OP = 'UPDATE' THEN
        -- Verificar cada campo y registrar cambios
        IF OLD.titulo != NEW.titulo THEN
            INSERT INTO public.task_history (task_id, usuario_id, campo_modificado, valor_anterior, valor_nuevo)
            VALUES (NEW.id, current_user_id, 'titulo', OLD.titulo, NEW.titulo);
        END IF;
        
        IF COALESCE(OLD.descripcion, '') != COALESCE(NEW.descripcion, '') THEN
            INSERT INTO public.task_history (task_id, usuario_id, campo_modificado, valor_anterior, valor_nuevo)
            VALUES (NEW.id, current_user_id, 'descripcion', COALESCE(OLD.descripcion, ''), COALESCE(NEW.descripcion, ''));
        END IF;
        
        IF OLD.asignado_a != NEW.asignado_a THEN
            INSERT INTO public.task_history (task_id, usuario_id, campo_modificado, valor_anterior, valor_nuevo)
            VALUES (NEW.id, current_user_id, 'asignado_a', OLD.asignado_a::text, NEW.asignado_a::text);
        END IF;
        
        IF OLD.prioridad != NEW.prioridad THEN
            INSERT INTO public.task_history (task_id, usuario_id, campo_modificado, valor_anterior, valor_nuevo)
            VALUES (NEW.id, current_user_id, 'prioridad', OLD.prioridad, NEW.prioridad);
        END IF;
        
        IF OLD.estado != NEW.estado THEN
            INSERT INTO public.task_history (task_id, usuario_id, campo_modificado, valor_anterior, valor_nuevo)
            VALUES (NEW.id, current_user_id, 'estado', OLD.estado, NEW.estado);
        END IF;
        
        IF OLD.privada != NEW.privada THEN
            INSERT INTO public.task_history (task_id, usuario_id, campo_modificado, valor_anterior, valor_nuevo)
            VALUES (NEW.id, current_user_id, 'privada', OLD.privada::text, NEW.privada::text);
        END IF;
        
        IF COALESCE(OLD.departamento, '') != COALESCE(NEW.departamento, '') THEN
            INSERT INTO public.task_history (task_id, usuario_id, campo_modificado, valor_anterior, valor_nuevo)
            VALUES (NEW.id, current_user_id, 'departamento', COALESCE(OLD.departamento, ''), COALESCE(NEW.departamento, ''));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para registrar cambios automáticamente
CREATE TRIGGER log_task_changes_trigger
    AFTER UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_changes();

-- Comentarios en las tablas para documentación
COMMENT ON TABLE public.tasks IS 'Tabla principal de tareas del sistema Atlas';
COMMENT ON COLUMN public.tasks.titulo IS 'Título de la tarea';
COMMENT ON COLUMN public.tasks.descripcion IS 'Descripción detallada de la tarea';
COMMENT ON COLUMN public.tasks.creador IS 'Usuario que creó la tarea';
COMMENT ON COLUMN public.tasks.asignado_a IS 'Usuario asignado a la tarea';
COMMENT ON COLUMN public.tasks.prioridad IS 'Prioridad: Baja, Media, Alta, Urgente';
COMMENT ON COLUMN public.tasks.estado IS 'Estado: Sin iniciar, En progreso, En espera, Finalizada';
COMMENT ON COLUMN public.tasks.privada IS 'Indica si la tarea es privada (solo visible para el creador)';
COMMENT ON COLUMN public.tasks.departamento IS 'Departamento (funcionalidad futura)';

COMMENT ON TABLE public.task_history IS 'Historial de cambios de las tareas';
COMMENT ON COLUMN public.task_history.campo_modificado IS 'Nombre del campo que fue modificado';
COMMENT ON COLUMN public.task_history.valor_anterior IS 'Valor anterior del campo';
COMMENT ON COLUMN public.task_history.valor_nuevo IS 'Valor nuevo del campo';
COMMENT ON COLUMN public.task_history.comentario IS 'Comentario opcional sobre el cambio';
