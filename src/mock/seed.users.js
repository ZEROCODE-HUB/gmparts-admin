// Usuarios mock para autenticación front-only (Fase B). El backend real reemplazará
// esto por Firebase Auth. user_role espeja users_record.dart (app_constants.dart:10-12).
const users = [
  { id: "u1", email: "admin@gmparts.com", password: "admin123", displayName: "GM Parts Admin", userRole: "Admin" },
  { id: "u2", email: "vendedor@gmparts.com", password: "vendedor123", displayName: "Ana Vendedor", userRole: "Vendedor" },
  { id: "u3", email: "almacenero@gmparts.com", password: "almacen123", displayName: "Carlos Almacén", userRole: "Almacenero" },
  { id: "u4", email: "tecnico@gmparts.com", password: "tecnico123", displayName: "Mecanico", userRole: "Técnico" },
];

export default users;
