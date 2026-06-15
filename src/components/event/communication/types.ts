export interface StructuredTemplate {
  subject: string;
  greeting: string;
  intro: string;
  closing: string;
  signature: string;
  // Extra fields per type
  extraFields?: Record<string, string>;
}

export interface MatchesWithoutTemplate {
  subject: string;
  greeting: string;
  message: string;
  closing: string;
  signature: string;
}

export interface CommunicationTemplates {
  registration_confirmation: StructuredTemplate;
  registration_with_code: StructuredTemplate;
  reminder: StructuredTemplate;
  selection_reminder: StructuredTemplate;
  matches: StructuredTemplate;
  matches_without: MatchesWithoutTemplate;
  checkin_code: StructuredTemplate;
  super_like: StructuredTemplate;
  no_show: MatchesWithoutTemplate;
  repeat_request_received: StructuredTemplate;
  repeat_request_accepted: StructuredTemplate;
  repeat_request_declined: StructuredTemplate;
  crush_request_received: StructuredTemplate;
  crush_mutual: StructuredTemplate;
  crush_declined: StructuredTemplate;
  payment_reminder: StructuredTemplate;
  primaryColor: string;
  logoUrl: string;
  brandName: string;
  headerTitle: string;
  logoHeight: number;
  reminderOptions?: ReminderOptions;
}

export type TemplateKey = "registration_confirmation" | "registration_with_code" | "reminder" | "selection_reminder" | "matches" | "checkin_code" | "super_like" | "no_show" | "repeat_request_received" | "repeat_request_accepted" | "repeat_request_declined" | "crush_request_received" | "crush_mutual" | "crush_declined" | "payment_reminder";

export interface ReminderOptions {
  showCalendarLinks: boolean;
  showUnsubscribe: boolean;
  showCountdown: boolean;
  unsubscribeText: string;
}

export const TEMPLATE_VARIABLES: Record<TemplateKey, string[]> = {
  registration_confirmation: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}"],
  registration_with_code: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}", "{{codigo}}"],
  reminder: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}"],
  selection_reminder: ["{{nombre}}", "{{evento}}"],
  matches: ["{{nombre}}", "{{evento}}"],
  checkin_code: ["{{nombre}}", "{{evento}}", "{{codigo}}"],
  super_like: ["{{nombre}}", "{{evento}}"],
  no_show: ["{{nombre}}", "{{evento}}"],
  repeat_request_received: ["{{nombre}}", "{{evento}}", "{{solicitante}}", "{{enlace_aceptar}}", "{{enlace_rechazar}}"],
  repeat_request_accepted: ["{{nombre}}", "{{evento}}", "{{ronda}}"],
  repeat_request_declined: ["{{nombre}}", "{{evento}}"],
  crush_request_received: ["{{nombre}}", "{{evento}}", "{{solicitante}}"],
  crush_mutual: ["{{nombre}}", "{{evento}}", "{{otraPersona}}", "{{contactoEmail}}", "{{ronda}}"],
  crush_declined: ["{{nombre}}", "{{evento}}"],
  payment_reminder: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}"],
};

export const DEFAULT_TEMPLATES_ES: CommunicationTemplates = {
  registration_confirmation: {
    subject: "¡Registro confirmado! - {{evento}}",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "Tu registro para el evento {{evento}} ha sido confirmado con éxito.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}",
    closing: "Te enviaremos un código de acceso antes del evento. ¡Asegúrate de llegar a tiempo!",
    signature: "¡Nos vemos en el evento!\nEquipo Konektum 🎉",
  },
  registration_with_code: {
    subject: "¡Registro confirmado! Tu código de acceso - {{evento}}",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "Tu registro para el evento {{evento}} ha sido confirmado con éxito.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}",
    closing: "Guarda este código, lo necesitarás para hacer check-in y acceder a tu panel durante y después del evento.",
    signature: "¡Nos vemos en el evento!\nEquipo Konektum 🎉",
  },
  reminder: {
    subject: "📅 Recordatorio: ¡No te olvides de {{evento}}!",
    greeting: "¡Hola {{nombre}}! 👋",
    intro: "Te recordamos que se acerca el evento {{evento}}.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}\n\n¡Te esperamos! No olvides llegar a tiempo.",
    closing: "¡Nos vemos pronto! 🎉",
    signature: "Un saludo,\nEquipo Konektum",
  },
  selection_reminder: {
    subject: "⏰ Recordatorio: ¡Envía tus selecciones para {{evento}}!",
    greeting: "¡Hola {{nombre}}! 👋",
    intro: "¡Aún estás a tiempo de indicar tus matches para el evento {{evento}}!\n\nNo te pierdas la oportunidad de conectar con las personas que conociste.",
    closing: "¡Esperamos que hayas pasado un buen rato! 💕",
    signature: "Este es un recordatorio automático.\nSi ya has enviado tus selecciones, ignora este mensaje.",
  },
  matches: {
    subject: "¡Tienes matches en {{evento}}! 🎉",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "¡Gracias por participar en nuestro evento! Tenemos buenas noticias: ¡has hecho match con otros participantes!",
    closing: "¡No dudes en contactarles! Los mejores momentos empiezan con una simple conversación.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
    extraFields: {
      friendshipTitle: "🤝 Tus matches de amistad:",
      datingTitle: "❤️ Tus matches de ligue:",
    },
  },
  matches_without: {
    subject: "Gracias por participar en {{evento}}",
    greeting: "¡Hola {{nombre}}! 👋",
    message: "¡Gracias por participar en nuestro evento!\n\nAunque en esta ocasión no hubo matches mutuos, ¡no te desanimes! Las conexiones a veces tardan en llegar, y estamos seguros de que en el próximo evento tendrás más suerte.\n\nRecuerda que cada evento es una oportunidad para conocer gente increíble. ¡Esperamos verte muy pronto!",
    closing: "¡Nos vemos en el próximo evento!",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  checkin_code: {
    subject: "Tu código de acceso - {{evento}}",
    greeting: "¡Hola {{nombre}}!",
    intro: "Has sido registrado/a en el evento {{evento}}. Usa este código para hacer tu check-in y acceder a tu panel.",
    closing: "Guarda este código, lo necesitarás durante y después del evento.",
    signature: "¡Disfruta del evento!\nEquipo Konektum",
  },
  super_like: {
    subject: "✨ ¡Alguien te ha seleccionado en {{evento}}!",
    greeting: "¡Hola {{nombre}}! ✨",
    intro: "¡Alguien de tu evento te ha elegido con un Super Like! No pierdas la oportunidad de descubrir si hay match.\n\nEntra en tu panel de participante y envía tus selecciones.",
    closing: "¡Las mejores conexiones empiezan con un simple paso!",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  no_show: {
    subject: "Te echamos de menos en {{evento}} 😢",
    greeting: "¡Hola {{nombre}}! 👋",
    message: "Vimos que te registraste en {{evento}} pero no pudiste asistir. ¡Fue una lástima no verte!\n\nNo te preocupes, estamos preparando nuevos eventos donde podrás conocer gente increíble. ¡Esperamos contar contigo la próxima vez!",
    closing: "¡Nos encantaría verte en el próximo evento!",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  repeat_request_received: {
    subject: "🔁 {{solicitante}} quiere volver a coincidir contigo en {{evento}}",
    greeting: "¡Hola {{nombre}}! 👋",
    intro: "{{solicitante}} ha pedido volver a coincidir contigo en una próxima ronda del evento {{evento}}.\n\nSi aceptas, os asignaremos a la misma mesa en la siguiente ronda disponible. Tu identidad solo se revelará si aceptas.",
    closing: "Pulsa el botón para responder. Tu decisión es totalmente confidencial.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  repeat_request_accepted: {
    subject: "✅ ¡Tu solicitud de repetir ha sido aceptada en {{evento}}!",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "¡Buenas noticias! La persona a la que pediste volver a coincidir ha aceptado tu solicitud.\n\nOs asignaremos a la misma mesa en la ronda {{ronda}}.",
    closing: "¡Disfruta del reencuentro! Las mejores conversaciones merecen una segunda oportunidad.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  repeat_request_declined: {
    subject: "Sobre tu solicitud de repetir en {{evento}}",
    greeting: "¡Hola {{nombre}}! 👋",
    intro: "Hemos comunicado tu solicitud de repetir, pero en esta ocasión no ha sido posible aplicarla. ¡No te desanimes!\n\nEsto es totalmente normal y ocurre con frecuencia. Aún tienes muchas oportunidades de hacer match con quienes mostraron interés en ti.",
    closing: "Sigue con tu experiencia y revisa tus matches al final del evento.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  crush_request_received: {
    subject: "💘 Has recibido un Flechazo en {{evento}}",
    greeting: "¡Hola {{nombre}}! 💘",
    intro: "Alguien a quien conociste en {{evento}} te ha enviado un Flechazo — le encantaría conectar contigo.\n\nSi aceptas, ambos recibiréis los datos de contacto del otro por email y os sentaremos en la misma mesa en la próxima ronda (si quedan rondas pendientes).",
    closing: "Pulsa un botón para responder. Solo se intercambian datos si aceptas.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  crush_mutual: {
    subject: "💘 ¡Flechazo mutuo con {{otraPersona}} en {{evento}}!",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "¡Buenas noticias! Tú y {{otraPersona}} tenéis un Flechazo mutuo en {{evento}}.\n\nAquí tienes su email de contacto para que puedas escribirle: {{contactoEmail}}\n\nSi aún quedan rondas, os asignaremos a la misma mesa en la ronda {{ronda}}.",
    closing: "¡Disfruta de la conexión! Las mejores historias empiezan con un primer paso.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  crush_declined: {
    subject: "Sobre tu Flechazo en {{evento}}",
    greeting: "¡Hola {{nombre}}! 👋",
    intro: "Hemos entregado tu Flechazo, pero la otra persona ha decidido no aceptarlo en esta ocasión. ¡No te desanimes! Cada evento trae nuevas oportunidades.",
    closing: "Sigue disfrutando de la experiencia.",
    signature: "Con cariño,\nEl equipo de Konektum 💕",
  },
  payment_reminder: {
    subject: "💳 Recordatorio: completa tu pago para {{evento}}",
    greeting: "¡Hola {{nombre}}! 👋",
    intro: "Te recordamos que tu inscripción a {{evento}} aún figura como pendiente de pago.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}\n\nPor favor, completa el pago para confirmar tu plaza.",
    closing: "Si ya has realizado el pago, ignora este mensaje. ¡Gracias!",
    signature: "Un saludo,\nEquipo Konektum",
  },
  primaryColor: "#e11d48",
  logoUrl: "",
  brandName: "Konektum",
  headerTitle: "¡Bienvenido/a al evento!",
  logoHeight: 48,
  reminderOptions: {
    showCalendarLinks: true,
    showUnsubscribe: true,
    showCountdown: false,
    unsubscribeText: "Si no puedes asistir, puedes darte de baja haciendo clic aquí.",
  },
};

export const DEFAULT_TEMPLATES_EN: CommunicationTemplates = {
  registration_confirmation: {
    subject: "Registration confirmed! - {{evento}}",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Your registration for {{evento}} has been confirmed.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}",
    closing: "We'll send you an access code before the event. Make sure to arrive on time!",
    signature: "See you at the event!\nKonektum Team 🎉",
  },
  registration_with_code: {
    subject: "Registration confirmed! Your access code - {{evento}}",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Your registration for {{evento}} has been confirmed.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}",
    closing: "Save this code, you will need it to check in and access your panel during and after the event.",
    signature: "See you at the event!\nKonektum Team 🎉",
  },
  reminder: {
    subject: "📅 Reminder: Don't forget about {{evento}}!",
    greeting: "Hi {{nombre}}! 👋",
    intro: "Just a reminder that the event {{evento}} is coming up.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}\n\nWe look forward to seeing you! Make sure to arrive on time.",
    closing: "See you soon! 🎉",
    signature: "Best regards,\nKonektum Team",
  },
  selection_reminder: {
    subject: "⏰ Reminder: Send your selections for {{evento}}!",
    greeting: "Hi {{nombre}}! 👋",
    intro: "You still have time to submit your matches for the event {{evento}}!\n\nDon't miss the opportunity to connect with the people you met.",
    closing: "We hope you had a great time! 💕",
    signature: "This is an automatic reminder.\nIf you have already sent your selections, please ignore this message.",
  },
  matches: {
    subject: "You have matches from {{evento}}! 🎉",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Thank you for attending our event! We have great news: you matched with other participants!",
    closing: "Don't hesitate to reach out! Great moments start with a simple conversation.",
    signature: "With love,\nThe Konektum Team 💕",
    extraFields: {
      friendshipTitle: "🤝 Your friendship matches:",
      datingTitle: "❤️ Your dating matches:",
    },
  },
  matches_without: {
    subject: "Thanks for joining {{evento}}",
    greeting: "Hi {{nombre}}! 👋",
    message: "Thank you for attending our event!\n\nAlthough there were no mutual matches this time, don't worry! Connections sometimes take time, and we're sure you'll have more luck at the next event.\n\nRemember that every event is an opportunity to meet amazing people. See you soon!",
    closing: "See you at the next event!",
    signature: "With love,\nThe Konektum Team 💕",
  },
  checkin_code: {
    subject: "Your access code - {{evento}}",
    greeting: "Hi {{nombre}}!",
    intro: "You have been registered for the event {{evento}}. Use this code to check in and access your panel.",
    closing: "Save this code, you will need it during and after the event.",
    signature: "Enjoy the event!\nKonektum Team",
  },
  super_like: {
    subject: "✨ Someone selected you at {{evento}}!",
    greeting: "Hi {{nombre}}! ✨",
    intro: "Someone at your event chose you with a Super Like! Don't miss the chance to find out if it's a match.\n\nGo to your participant panel and submit your selections.",
    closing: "The best connections start with a simple step!",
    signature: "With love,\nThe Konektum Team 💕",
  },
  no_show: {
    subject: "We missed you at {{evento}} 😢",
    greeting: "Hi {{nombre}}! 👋",
    message: "We noticed you registered for {{evento}} but couldn't make it. We're sorry you couldn't join us!\n\nDon't worry, we're preparing new events where you can meet amazing people. We hope to see you next time!",
    closing: "We'd love to see you at the next event!",
    signature: "With love,\nThe Konektum Team 💕",
  },
  repeat_request_received: {
    subject: "🔁 {{solicitante}} wants to meet you again at {{evento}}",
    greeting: "Hi {{nombre}}! 👋",
    intro: "{{solicitante}} has asked to meet you again in an upcoming round of {{evento}}.\n\nIf you accept, we'll seat you together at the same table in the next available round. Your identity will only be revealed if you accept.",
    closing: "Tap the button below to respond. Your decision is fully confidential.",
    signature: "With love,\nThe Konektum Team 💕",
  },
  repeat_request_accepted: {
    subject: "✅ Your repeat request has been accepted at {{evento}}!",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Great news! The person you asked to meet again has accepted your request.\n\nWe'll seat you at the same table in round {{ronda}}.",
    closing: "Enjoy the reconnection! The best conversations deserve a second chance.",
    signature: "With love,\nThe Konektum Team 💕",
  },
  repeat_request_declined: {
    subject: "About your repeat request at {{evento}}",
    greeting: "Hi {{nombre}}! 👋",
    intro: "We've delivered your repeat request, but it wasn't possible to apply it this time. Don't be discouraged!\n\nThis is completely normal and happens often. You still have plenty of opportunities to match with people who showed interest in you.",
    closing: "Keep enjoying the experience and check your matches at the end of the event.",
    signature: "With love,\nThe Konektum Team 💕",
  },
  crush_request_received: {
    subject: "💘 You received a Flechazo at {{evento}}",
    greeting: "Hi {{nombre}}! 💘",
    intro: "Someone you met at {{evento}} has sent you a Flechazo — they'd love to connect with you.\n\nIf you accept, you'll both receive each other's contact details by email and we'll seat you together at the same table in the next round (if any rounds remain).",
    closing: "Tap a button to respond. Contact details are only shared if you accept.",
    signature: "With love,\nThe Konektum Team 💕",
  },
  crush_mutual: {
    subject: "💘 Mutual Flechazo with {{otraPersona}} at {{evento}}!",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Great news! You and {{otraPersona}} have a mutual Flechazo at {{evento}}.\n\nHere's their contact email so you can reach out: {{contactoEmail}}\n\nIf any rounds remain, we'll seat you together at the same table in round {{ronda}}.",
    closing: "Enjoy the connection! The best stories start with a first step.",
    signature: "With love,\nThe Konektum Team 💕",
  },
  crush_declined: {
    subject: "About your Flechazo at {{evento}}",
    greeting: "Hi {{nombre}}! 👋",
    intro: "We've delivered your Flechazo, but the other person decided not to accept this time. Don't be discouraged — every event brings new opportunities!",
    closing: "Keep enjoying the experience.",
    signature: "With love,\nThe Konektum Team 💕",
  },
  payment_reminder: {
    subject: "💳 Reminder: complete your payment for {{evento}}",
    greeting: "Hi {{nombre}}! 👋",
    intro: "Just a reminder that your registration for {{evento}} is still marked as unpaid.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}\n\nPlease complete the payment to secure your spot.",
    closing: "If you already paid, please ignore this message. Thank you!",
    signature: "Best regards,\nKonektum Team",
  },
  primaryColor: "#e11d48",
  logoUrl: "",
  brandName: "Konektum",
  headerTitle: "Welcome to the event!",
  logoHeight: 48,
  reminderOptions: {
    showCalendarLinks: true,
    showUnsubscribe: true,
    showCountdown: false,
    unsubscribeText: "If you can't attend, you can unsubscribe by clicking here.",
  },
};
