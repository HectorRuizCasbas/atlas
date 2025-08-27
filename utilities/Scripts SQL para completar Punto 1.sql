-- SCRIPTS SQL PARA COMPLETAR EL PUNTO 1 - FASE 1: ESTRUCTURA Y MODELO DE DATOS
-- Ejecutar en Supabase SQL Editor en el orden indicado

-- =====================================================
-- 1. CREAR TABLA DEPARTAMENTOS
-- =====================================================
CREATE TABLE public.departamentos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL UNIQUE,
    descripcion text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Comentarios para documentación
COMMENT ON TABLE public.departamentos IS 'Tabla de departamentos del sistema Atlas';
COMMENT ON COLUMN public.departamentos.nombre IS 'Nombre único del departamento';
COMMENT ON COLUMN public.departamentos.descripcion IS 'Descripción opcional del departamento';

-- =====================================================
-- 2. CREAR TABLA NOTIFICACIONES
-- =====================================================
CREATE TABLE public.notificaciones (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tipo text NOT NULL,
    mensaje text NOT NULL,
    leida boolean NOT NULL DEFAULT false,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Constraint para validar tipos de notificación
    CONSTRAINT notificaciones_tipo_check CHECK (
        tipo IN ('tarea_asignada', 'tarea_modificada', 'solicitud_acceso', 'tarea_finalizada')
    )
);

-- Índices para rendimiento
CREATE INDEX idx_notificaciones_usuario_id ON public.notificaciones(usuario_id);
CREATE INDEX idx_notificaciones_leida ON public.notificaciones(usuario_id, leida);
CREATE INDEX idx_notificaciones_created_at ON public.notificaciones(created_at);

-- Comentarios para documentación
COMMENT ON TABLE public.notificaciones IS 'Sistema de notificaciones para usuarios';
COMMENT ON COLUMN public.notificaciones.tipo IS 'Tipo de notificación: tarea_asignada, tarea_modificada, solicitud_acceso, tarea_finalizada';
COMMENT ON COLUMN public.notificaciones.mensaje IS 'Mensaje de la notificación';
COMMENT ON COLUMN public.notificaciones.leida IS 'Indica si la notificación ha sido leída';

-- =====================================================
-- 3. ACTUALIZAR TABLA PROFILES - AGREGAR CAMPOS FALTANTES
-- =====================================================

-- Agregar campo full_name si no existe
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS full_name text;

-- Agregar campo departamento_id
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS departamento_id uuid REFERENCES public.departamentos(id);

-- Actualizar constraint de roles para incluir todos los roles necesarios
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_role_check CHECK (
    role = ANY (ARRAY['Administrador'::text, 'Responsable'::text, 'Coordinador'::text, 'Usuario'::text])
);

-- Comentarios actualizados
COMMENT ON COLUMN public.profiles.full_name IS 'Nombre completo del usuario';
COMMENT ON COLUMN public.profiles.departamento_id IS 'Departamento al que pertenece el usuario';
COMMENT ON COLUMN public.profiles.role IS 'Rol del usuario: Administrador, Responsable, Coordinador, Usuario';

-- =====================================================
-- 4. ACTUALIZAR TABLA TASKS - CAMBIAR DEPARTAMENTO A REFERENCIA
-- =====================================================

-- Cambiar el campo departamento de text a uuid con referencia
ALTER TABLE public.tasks 
ALTER COLUMN departamento TYPE uuid USING NULL;

-- Agregar constraint de clave foránea
ALTER TABLE public.tasks 
ADD CONSTRAINT tasks_departamento_fkey 
FOREIGN KEY (departamento) REFERENCES public.departamentos(id);

-- Comentario actualizado
COMMENT ON COLUMN public.tasks.departamento IS 'Departamento al que pertenece la tarea';

-- =====================================================
-- 5. MEJORAR ÍNDICES EN TASK_HISTORY PARA RENDIMIENTO
-- =====================================================

-- Índice compuesto para consultas de historial/chat por tarea
CREATE INDEX IF NOT EXISTS idx_task_history_task_type_created 
ON public.task_history(task_id, campo_modificado, created_at);

-- Índice para consultas de chat específicamente
CREATE INDEX IF NOT EXISTS idx_task_history_chat_messages 
ON public.task_history(task_id, created_at) 
WHERE campo_modificado = 'chat_message';

-- =====================================================
-- 6. CREAR DATOS INICIALES - DEPARTAMENTO POR DEFECTO
-- =====================================================

-- Insertar departamento por defecto para usuarios existentes
INSERT INTO public.departamentos (id, nombre, descripcion) 
VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid, 
    'General', 
    'Departamento general por defecto'
) ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- 7. FUNCIONES AUXILIARES PARA NOTIFICACIONES
-- =====================================================

-- Función para crear notificación automática
CREATE OR REPLACE FUNCTION create_notification(
    p_usuario_id uuid,
    p_tipo text,
    p_mensaje text,
    p_task_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
    notification_id uuid;
BEGIN
    INSERT INTO public.notificaciones (usuario_id, tipo, mensaje, task_id)
    VALUES (p_usuario_id, p_tipo, p_mensaje, p_task_id)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGER PARA NOTIFICACIONES AUTOMÁTICAS
-- =====================================================

-- Función para crear notificaciones automáticas en cambios de tareas
CREATE OR REPLACE FUNCTION notify_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar al usuario asignado cuando se le asigna una tarea nueva
    IF TG_OP = 'INSERT' THEN
        PERFORM create_notification(
            NEW.asignado_a,
            'tarea_asignada',
            'Se te ha asignado una nueva tarea: ' || NEW.titulo,
            NEW.id
        );
        RETURN NEW;
    END IF;
    
    -- Notificar cambios en tareas existentes
    IF TG_OP = 'UPDATE' THEN
        -- Si cambió el usuario asignado
        IF OLD.asignado_a != NEW.asignado_a THEN
            PERFORM create_notification(
                NEW.asignado_a,
                'tarea_asignada',
                'Se te ha asignado la tarea: ' || NEW.titulo,
                NEW.id
            );
        END IF;
        
        -- Si cambió el estado a "Finalizada", notificar al creador
        IF OLD.estado != 'Finalizada' AND NEW.estado = 'Finalizada' THEN
            PERFORM create_notification(
                NEW.creador,
                'tarea_finalizada',
                'Tu tarea "' || NEW.titulo || '" ha sido finalizada',
                NEW.id
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para notificaciones automáticas
DROP TRIGGER IF EXISTS notify_task_changes_trigger ON public.tasks;
CREATE TRIGGER notify_task_changes_trigger
    AFTER INSERT OR UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION notify_task_changes();

-- =====================================================
-- 9. POLÍTICAS RLS (ROW LEVEL SECURITY) - OPCIONAL
-- =====================================================

-- Habilitar RLS en las tablas principales (comentado por ahora)
-- ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 10. VERIFICACIÓN FINAL
-- =====================================================

-- Query para verificar que todo se creó correctamente
SELECT 
    'departamentos' as tabla,
    COUNT(*) as registros
FROM public.departamentos
UNION ALL
SELECT 
    'notificaciones' as tabla,
    COUNT(*) as registros
FROM public.notificaciones
UNION ALL
SELECT 
    'profiles_con_full_name' as tabla,
    COUNT(*) as registros
FROM public.profiles 
WHERE full_name IS NOT NULL OR full_name IS NULL; -- Contar todos

-- Verificar índices creados
SELECT 
    schemaname,
    tablename,
    indexname
FROM pg_indexes 
WHERE tablename IN ('task_history', 'notificaciones', 'departamentos')
AND schemaname = 'public'
ORDER BY tablename, indexname;
