const {onCall} = require("firebase-functions/v2/https");
const {setGlobalOptions} = require("firebase-functions/v2");
const admin = require("firebase-admin");

setGlobalOptions({region: "us-central1", maxInstances: 5});

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.notifySlotAvailable = onCall(async (request) => {
  const {classId, classTitle} = request.data || {};

  if (!classId || !classTitle) {
    throw new Error("classId y classTitle son obligatorios");
  }

  const usersSnapshot = await admin.firestore().collection("users").get();

  const tokens = [];
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    if (Array.isArray(data.pushTokens)) {
      tokens.push(...data.pushTokens);
    }
  });

  if (!tokens.length) {
    return {success: false, message: "No hay tokens disponibles"};
  }

  const message = {
    notification: {
      title: `Se libero un lugar en ${classTitle}`,
      body: "Abri Vitbox para reservar tu cupo.",
    },
    data: {
      classId,
    },
    webpush: {
      notification: {
        icon: "https://vitboxapp.netlify.app/logo-vitbox-192.png",
        badge: "https://vitboxapp.netlify.app/logo-vitbox-96.png",
      },
    },
    tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  return {success: true, response};
});
