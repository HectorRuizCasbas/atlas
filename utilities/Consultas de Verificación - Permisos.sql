-- CONSULTAS DE VERIFICACIÓN - SISTEMA DE PERMISOS
-- Ejecutar DESPUÉS de aplicar los Scripts SQL Punto 2

-- =====================================================
-- 1. VERIFICAR QUE TODAS LAS POLÍTICAS SE CREARON
-- =====================================================

SELECT 
    tablename,
    policyname,
    cmd as operacion,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Lectura'
        WHEN cmd = 'INSERT' THEN 'Inserción'
        WHEN cmd = 'UPDATE' THEN 'Actualización'
        WHEN cmd = 'DELETE' THEN 'Eliminación'
        WHEN cmd = 'ALL' THEN 'Todas las operaciones'
    END as tipo_operacion
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- =====================================================
-- 2. VERIFICAR QUE RLS ESTÁ HABILITADO
-- =====================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_habilitado
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'tasks', 'task_history', 'notificaciones', 'departamentos')
ORDER BY tablename;

-- =====================================================
-- 3. VERIFICAR FUNCIONES AUXILIARES CREADAS
-- =====================================================

SELECT 
    routine_name as nombre_funcion,
    routine_type as tipo,
    data_type as tipo_retorno
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_role', 
    'is_admin', 
    'is_manager', 
    'get_user_department',
    'same_department',
    'can_view_task',
    'can_modify_task_field'
)
ORDER BY routine_name;

-- =====================================================
-- 4. CREAR DATOS DE PRUEBA (OPCIONAL)
-- =====================================================

-- Insertar departamentos de prueba
INSERT INTO public.departamentos (id, nombre, descripcion) VALUES
('11111111-1111-1111-1111-111111111111', 'IT', 'Departamento de Tecnología'),
('22222222-2222-2222-2222-222222222222', 'RRHH', 'Recursos Humanos'),
('33333333-3333-3333-3333-333333333333', 'Ventas', 'Departamento de Ventas')
ON CONFLICT (nombre) DO NOTHING;

-- =====================================================
-- 5. CONSULTAS PARA PROBAR DESPUÉS DE CREAR USUARIOS
-- =====================================================

-- NOTA: Estas consultas se ejecutarán cuando tengamos usuarios reales
-- Por ahora están comentadas para referencia

/*
-- Verificar que las funciones de permisos funcionan
SELECT 
    'Función get_user_role()' as prueba,
    get_user_role() as resultado;

SELECT 
    'Función is_admin()' as prueba,
    is_admin() as resultado;

SELECT 
    'Función is_manager()' as prueba,
    is_manager() as resultado;

SELECT 
    'Función get_user_department()' as prueba,
    get_user_department() as resultado;

-- Probar visibilidad de perfiles según rol
SELECT 
    'Perfiles visibles para usuario actual' as prueba,
    COUNT(*) as cantidad
FROM public.profiles;

-- Probar visibilidad de tareas según rol
SELECT 
    'Tareas visibles para usuario actual' as prueba,
    COUNT(*) as cantidad
FROM public.tasks;

-- Probar notificaciones propias
SELECT 
    'Notificaciones propias' as prueba,
    COUNT(*) as cantidad
FROM public.notificaciones;
*/

-- =====================================================
-- 6. VERIFICAR TRIGGERS CREADOS
-- =====================================================

SELECT 
    trigger_name,
    event_manipulation as evento,
    action_timing as momento,
    action_statement as accion
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name IN ('notify_task_changes_trigger', 'validate_task_changes_trigger')
ORDER BY trigger_name;

-- =====================================================
-- 7. PROBAR INSERCIÓN DE DEPARTAMENTOS (DEBE FALLAR SIN ADMIN)
-- =====================================================

-- Esta consulta debería fallar si no eres admin
-- INSERT INTO public.departamentos (nombre, descripcion) 
-- VALUES ('Prueba', 'Departamento de prueba');

-- =====================================================
-- 8. RESUMEN DE VERIFICACIÓN
-- =====================================================

SELECT 
    'RESUMEN DE VERIFICACIÓN' as titulo,
    '' as detalle
UNION ALL
SELECT 
    'Políticas creadas',
    COUNT(*)::text
FROM pg_policies 
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Tablas con RLS habilitado',
    COUNT(*)::text
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'tasks', 'task_history', 'notificaciones', 'departamentos')
AND rowsecurity = true
UNION ALL
SELECT 
    'Funciones auxiliares creadas',
    COUNT(*)::text
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_user_role', 'is_admin', 'is_manager', 
    'get_user_department', 'same_department',
    'can_view_task', 'can_modify_task_field'
)
UNION ALL
SELECT 
    'Triggers activos',
    COUNT(*)::text
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
AND trigger_name IN ('notify_task_changes_trigger', 'validate_task_changes_trigger');
