-- SCRIPTS SQL PARA COMPLETAR EL PUNTO 2 - ROLES Y PERMISOS
-- Ejecutar después del Punto 1 en Supabase SQL Editor

-- =====================================================
-- 1. FUNCIONES AUXILIARES PARA VERIFICAR PERMISOS
-- =====================================================

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS text AS $$
BEGIN
    RETURN (
        SELECT role 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN get_user_role() = 'Administrador';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es responsable o coordinador
CREATE OR REPLACE FUNCTION is_manager()
RETURNS boolean AS $$
BEGIN
    RETURN get_user_role() IN ('Responsable', 'Coordinador');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el departamento del usuario actual
CREATE OR REPLACE FUNCTION get_user_department()
RETURNS uuid AS $$
BEGIN
    RETURN (
        SELECT departamento_id 
        FROM public.profiles 
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si dos usuarios están en el mismo departamento
CREATE OR REPLACE FUNCTION same_department(user_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN (
        SELECT departamento_id 
        FROM public.profiles 
        WHERE id = user_id
    ) = get_user_department();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 2. HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. POLÍTICAS PARA TABLA PROFILES
-- =====================================================

-- Los usuarios pueden ver su propio perfil
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

-- Admins pueden ver todos los perfiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT USING (is_admin());

-- Responsables y coordinadores pueden ver perfiles de su departamento
CREATE POLICY "managers_can_view_department_profiles" ON public.profiles
    FOR SELECT USING (
        is_manager() AND same_department(id)
    );

-- Los usuarios pueden actualizar su propio perfil (campos limitados)
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Solo admins pueden insertar nuevos perfiles
CREATE POLICY "admins_can_insert_profiles" ON public.profiles
    FOR INSERT WITH CHECK (is_admin());

-- Solo admins pueden eliminar perfiles
CREATE POLICY "admins_can_delete_profiles" ON public.profiles
    FOR DELETE USING (is_admin());

-- =====================================================
-- 4. POLÍTICAS PARA TABLA TASKS
-- =====================================================

-- Función auxiliar para verificar visibilidad de tareas
CREATE OR REPLACE FUNCTION can_view_task(task_row public.tasks)
RETURNS boolean AS $$
BEGIN
    -- Admins pueden ver todas las tareas
    IF is_admin() THEN
        RETURN true;
    END IF;
    
    -- Si la tarea es privada, solo creador y asignado pueden verla
    IF task_row.privada THEN
        RETURN task_row.creador = auth.uid() OR task_row.asignado_a = auth.uid();
    END IF;
    
    -- Para tareas públicas:
    -- - Creador y asignado siempre pueden ver
    IF task_row.creador = auth.uid() OR task_row.asignado_a = auth.uid() THEN
        RETURN true;
    END IF;
    
    -- - Responsables y coordinadores pueden ver tareas de su departamento
    IF is_manager() AND task_row.departamento = get_user_department() THEN
        RETURN true;
    END IF;
    
    -- - Usuarios normales pueden ver tareas públicas de su departamento
    IF task_row.departamento = get_user_department() THEN
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política de SELECT para tareas
CREATE POLICY "task_visibility_policy" ON public.tasks
    FOR SELECT USING (can_view_task(tasks));

-- Política de INSERT para tareas
CREATE POLICY "users_can_create_tasks" ON public.tasks
    FOR INSERT WITH CHECK (
        -- Usuarios autenticados pueden crear tareas
        auth.uid() IS NOT NULL AND
        -- El creador debe ser el usuario actual
        creador = auth.uid()
    );

-- Política de UPDATE para tareas
CREATE POLICY "task_update_policy" ON public.tasks
    FOR UPDATE USING (
        -- Admins pueden modificar cualquier tarea
        is_admin() OR
        -- Creadores pueden modificar sus tareas
        creador = auth.uid() OR
        -- Asignados pueden modificar estado y prioridad (no privacidad)
        asignado_a = auth.uid() OR
        -- Responsables/coordinadores pueden modificar tareas de su departamento
        (is_manager() AND departamento = get_user_department())
    );

-- Política de DELETE para tareas
CREATE POLICY "task_delete_policy" ON public.tasks
    FOR DELETE USING (
        -- Solo admins y creadores pueden eliminar tareas
        is_admin() OR creador = auth.uid()
    );

-- =====================================================
-- 5. POLÍTICAS PARA TABLA TASK_HISTORY
-- =====================================================

-- Los usuarios pueden ver historial de tareas que pueden ver
CREATE POLICY "task_history_visibility" ON public.task_history
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.tasks 
            WHERE id = task_history.task_id 
            AND can_view_task(tasks)
        )
    );

-- Los usuarios pueden insertar en historial de tareas que pueden modificar
CREATE POLICY "task_history_insert" ON public.task_history
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks 
            WHERE id = task_history.task_id 
            AND (
                is_admin() OR 
                creador = auth.uid() OR 
                asignado_a = auth.uid() OR
                (is_manager() AND departamento = get_user_department())
            )
        )
    );

-- =====================================================
-- 6. POLÍTICAS PARA TABLA NOTIFICACIONES
-- =====================================================

-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "users_view_own_notifications" ON public.notificaciones
    FOR SELECT USING (usuario_id = auth.uid());

-- Los usuarios pueden marcar como leídas sus notificaciones
CREATE POLICY "users_update_own_notifications" ON public.notificaciones
    FOR UPDATE USING (usuario_id = auth.uid())
    WITH CHECK (usuario_id = auth.uid());

-- Sistema puede insertar notificaciones (para triggers)
CREATE POLICY "system_can_insert_notifications" ON public.notificaciones
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 7. POLÍTICAS PARA TABLA DEPARTAMENTOS
-- =====================================================

-- Todos los usuarios autenticados pueden ver departamentos
CREATE POLICY "authenticated_users_view_departments" ON public.departamentos
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admins pueden modificar departamentos
CREATE POLICY "admins_manage_departments" ON public.departamentos
    FOR ALL USING (is_admin())
    WITH CHECK (is_admin());

-- =====================================================
-- 8. FUNCIÓN PARA VERIFICAR PERMISOS DE MODIFICACIÓN DE TAREAS
-- =====================================================

-- Función para verificar qué campos puede modificar un usuario
CREATE OR REPLACE FUNCTION can_modify_task_field(
    task_id uuid,
    field_name text
)
RETURNS boolean AS $$
DECLARE
    task_record public.tasks;
    user_role text;
BEGIN
    -- Obtener la tarea
    SELECT * INTO task_record FROM public.tasks WHERE id = task_id;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    user_role := get_user_role();
    
    -- Admins pueden modificar todo
    IF user_role = 'Administrador' THEN
        RETURN true;
    END IF;
    
    -- Creadores pueden modificar todo excepto asignación si es tarea privada de otro
    IF task_record.creador = auth.uid() THEN
        IF field_name = 'asignado_a' AND task_record.privada AND task_record.asignado_a != auth.uid() THEN
            RETURN false;
        END IF;
        RETURN true;
    END IF;
    
    -- Asignados pueden modificar estado y prioridad
    IF task_record.asignado_a = auth.uid() THEN
        RETURN field_name IN ('estado', 'prioridad');
    END IF;
    
    -- Responsables/coordinadores pueden modificar tareas de su departamento
    IF user_role IN ('Responsable', 'Coordinador') AND task_record.departamento = get_user_department() THEN
        -- No pueden modificar tareas privadas que no les pertenecen
        IF task_record.privada AND task_record.creador != auth.uid() AND task_record.asignado_a != auth.uid() THEN
            RETURN false;
        END IF;
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 9. TRIGGER PARA VALIDAR MODIFICACIONES DE TAREAS
-- =====================================================

-- Función para validar cambios en tareas según permisos
CREATE OR REPLACE FUNCTION validate_task_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Verificar que el campo privada solo lo puede cambiar el creador si está asignado a sí mismo
    IF OLD.privada != NEW.privada THEN
        IF NEW.creador != auth.uid() OR NEW.asignado_a != auth.uid() THEN
            RAISE EXCEPTION 'Solo el creador puede cambiar la privacidad de una tarea asignada a sí mismo';
        END IF;
    END IF;
    
    -- Verificar que no se puede asignar tarea privada a otro usuario
    IF NEW.privada AND NEW.asignado_a != NEW.creador THEN
        RAISE EXCEPTION 'Las tareas privadas solo pueden estar asignadas al creador';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validaciones
DROP TRIGGER IF EXISTS validate_task_changes_trigger ON public.tasks;
CREATE TRIGGER validate_task_changes_trigger
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION validate_task_changes();

-- =====================================================
-- 10. VERIFICACIÓN DE POLÍTICAS CREADAS
-- =====================================================

-- Query para verificar que todas las políticas se crearon
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
