// Translation messages for Twilio call responses
// These are used in the call-handler function

export const callMessages = {
  en: {
    ORDER_CONFIRMATION: (customerName: string, itemsList: string) =>
      `Hello ${customerName}! This is our store calling to confirm your order. You ordered ${itemsList}. Is this correct?`,
    ORDER_CONFIRMATION_NO_RESPONSE: "We didn't receive your response. Please try again.",
    QUANTITY_CONFIRMATION: (quantityList: string, total: number) =>
      `Let me confirm the quantities. You have ${quantityList}. Your current total is $${total}. Are these quantities correct? If you'd like to change any quantity, please tell me now.`,
    QUANTITY_UPDATED: (quantityList: string, total: number) =>
      `I've updated your order. You now have ${quantityList}. Your new total is $${total}. Is this correct, or would you like to make more changes?`,
    QUANTITY_NO_RESPONSE: "We didn't receive your response. Please try again.",
    ADDRESS_CONFIRMATION: (address: string) =>
      `Great! Your delivery address is ${address}. Is this correct? If you need to change it, please say the new address.`,
    ADDRESS_NO_RESPONSE: "We didn't receive your response. Please try again.",
    PAYMENT_CONFIRMATION_ONE_TIME: (amount: number, brand: string, last4: string) =>
      `Your payment of $${amount} will be charged to your ${brand} ending in ${last4}. Is this correct?`,
    PAYMENT_CONFIRMATION_SUBSCRIPTION: (amount: number, brand: string, last4: string) =>
      `Your monthly subscription of $${amount} will be charged to your ${brand} ending in ${last4}. Is this correct?`,
    PAYMENT_NO_RESPONSE: "We didn't receive your response. Please try again.",
    DELIVERY_TIME: "When would you prefer delivery? You can choose morning, afternoon, or evening.",
    DELIVERY_TIME_NO_RESPONSE: "We didn't receive your response. Please try again.",
    CALL_COMPLETE_CONFIRMED: (deliveryTime?: string) =>
      `Thank you! Your order has been confirmed. ${deliveryTime ? `We'll deliver during the ${deliveryTime}.` : ''} Have a great day!`,
    CALL_COMPLETE_CANCELLED:
      "We understand. Your order has been cancelled and you will not be charged. Thank you for letting us know.",
    TECHNICAL_DIFFICULTIES:
      "We're experiencing technical difficulties. Please call us directly.",
  },
  bg: {
    ORDER_CONFIRMATION: (customerName: string, itemsList: string) =>
      `Здравейте ${customerName}! Обаждаме се от нашия магазин, за да потвърдим поръчката ви. Поръчахте ${itemsList}. Правилно ли е това?`,
    ORDER_CONFIRMATION_NO_RESPONSE: "Не получихме вашия отговор. Моля, опитайте отново.",
    QUANTITY_CONFIRMATION: (quantityList: string, total: number) =>
      `Нека потвърдя количествата. Имате ${quantityList}. Вашата текуща обща сума е $${total}. Правилни ли са тези количества? Ако искате да промените някое количество, моля кажете сега.`,
    QUANTITY_UPDATED: (quantityList: string, total: number) =>
      `Актуализирах вашата поръчка. Сега имате ${quantityList}. Вашата нова обща сума е $${total}. Правилно ли е това, или искате да направите още промени?`,
    QUANTITY_NO_RESPONSE: "Не получихме вашия отговор. Моля, опитайте отново.",
    ADDRESS_CONFIRMATION: (address: string) =>
      `Отлично! Вашият адрес за доставка е ${address}. Правилно ли е това? Ако трябва да го промените, моля кажете новия адрес.`,
    ADDRESS_NO_RESPONSE: "Не получихме вашия отговор. Моля, опитайте отново.",
    PAYMENT_CONFIRMATION_ONE_TIME: (amount: number, brand: string, last4: string) =>
      `Вашето плащане от $${amount} ще бъде таксувано към вашата ${brand} карта, завършваща на ${last4}. Правилно ли е това?`,
    PAYMENT_CONFIRMATION_SUBSCRIPTION: (amount: number, brand: string, last4: string) =>
      `Вашият месечен абонамент от $${amount} ще бъде таксуван към вашата ${brand} карта, завършваща на ${last4}. Правилно ли е това?`,
    PAYMENT_NO_RESPONSE: "Не получихме вашия отговор. Моля, опитайте отново.",
    DELIVERY_TIME: "Кога бихте предпочели доставка? Можете да изберете сутрин, следобед или вечер.",
    DELIVERY_TIME_NO_RESPONSE: "Не получихме вашия отговор. Моля, опитайте отново.",
    CALL_COMPLETE_CONFIRMED: (deliveryTime?: string) =>
      `Благодарим ви! Вашата поръчка е потвърдена. ${deliveryTime ? `Ще доставим по време на ${deliveryTime}.` : ''} Приятен ден!`,
    CALL_COMPLETE_CANCELLED:
      "Разбираме. Вашата поръчка е отменена и няма да бъдете таксувани. Благодарим ви, че ни уведомихте.",
    TECHNICAL_DIFFICULTIES:
      "Изпитваме технически затруднения. Моля, обадете се директно.",
  },
}

// Helper function to get call messages by language
export function getCallMessages(language: 'en' | 'bg' = 'en') {
  return callMessages[language]
}

