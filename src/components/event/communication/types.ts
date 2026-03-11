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
  reminder: StructuredTemplate;
  matches: StructuredTemplate;
  matches_without: MatchesWithoutTemplate;
  checkin_code: StructuredTemplate;
  super_like: StructuredTemplate;
  primaryColor: string;
  logoUrl: string;
  brandName: string;
}

export type TemplateKey = "registration_confirmation" | "reminder" | "matches" | "checkin_code" | "super_like";

export const TEMPLATE_VARIABLES: Record<TemplateKey, string[]> = {
  registration_confirmation: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}"],
  reminder: ["{{nombre}}", "{{evento}}", "{{fecha}}", "{{ubicacion}}", "{{hora}}"],
  matches: ["{{nombre}}", "{{evento}}"],
  checkin_code: ["{{nombre}}", "{{evento}}", "{{codigo}}"],
  super_like: ["{{nombre}}", "{{evento}}"],
};

export const DEFAULT_TEMPLATES_ES: CommunicationTemplates = {
  registration_confirmation: {
    subject: "¡Registro confirmado! - {{evento}}",
    greeting: "¡Hola {{nombre}}! 🎉",
    intro: "Tu registro para el evento {{evento}} ha sido confirmado con éxito.\n\n📅 Fecha: {{fecha}}\n📍 Lugar: {{ubicacion}}\n🕐 Hora: {{hora}}",
    closing: "Te enviaremos un código de acceso antes del evento. ¡Asegúrate de llegar a tiempo!",
    signature: "¡Nos vemos en el evento!\nEquipo Konektum 🎉",
  },
  reminder: {
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
  primaryColor: "#e11d48",
  logoUrl: "",
  brandName: "Konektum",
};

export const DEFAULT_TEMPLATES_EN: CommunicationTemplates = {
  registration_confirmation: {
    subject: "Registration confirmed! - {{evento}}",
    greeting: "Hi {{nombre}}! 🎉",
    intro: "Your registration for {{evento}} has been confirmed.\n\n📅 Date: {{fecha}}\n📍 Location: {{ubicacion}}\n🕐 Time: {{hora}}",
    closing: "We'll send you an access code before the event. Make sure to arrive on time!",
    signature: "See you at the event!\nKonektum Team 🎉",
  },
  reminder: {
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
  primaryColor: "#e11d48",
  logoUrl: "",
  brandName: "Konektum",
};
