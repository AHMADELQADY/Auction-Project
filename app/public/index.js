const wrapper = document.querySelector('.wrapper');
const loginLink = document.querySelector('.login-link');
const registerLink = document.querySelector('.register-link');
const btnPopup = document.querySelector('.btnLogin-popup');
const iconClose = document.querySelector('.icon-close');
// Passa a Register
registerLink.addEventListener('click', () => {
    wrapper.classList.add('active');
    console.log('Switching to Register form:', wrapper.classList.contains('active'));
});

// Torna a Login
loginLink.addEventListener('click', () => {
    wrapper.classList.remove('active');
    console.log('Switching to Login form:', !wrapper.classList.contains('active'));
});

// Mostra il popup
btnPopup.addEventListener('click', () => {
    wrapper.classList.add('active-popup');
    document.getElementById("bestauctionsite").classList.add("hidden");
    document.getElementById("frase").classList.add("hidden");    
    console.log('Popup opened:', wrapper.classList.contains('active-popup'));
});

// Chiudi il popup
iconClose.addEventListener('click', () => {
    wrapper.classList.remove('active-popup');
    document.getElementById("bestauctionsite").classList.remove("hidden");
    document.getElementById("frase").classList.remove("hidden");
    console.log('Popup closed:', !wrapper.classList.contains('active-popup'));
});

//--------------------------------- Gestione di errori SignUp

document.addEventListener("DOMContentLoaded", () => {
  // Riferimenti ai moduli e ai messaggi di errore
  const loginForm = document.querySelector(".form-box.login form");
  const registerForm = document.querySelector(".form-box.register form");
  const loginErrorMessage = document.getElementById("loginErrorMessage");
  const registerErrorMessage = document.getElementById("registerErrorMessage");

  // Utility function per gestire i form
  async function handleFormSubmission(form, errorMessageElement, apiEndpoint) {
    const formData = new FormData(form);
    const body = Object.fromEntries(formData.entries()); // Converte FormData in JSON-like object

    try {
      // Invia i dati al server
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // Ottieni la risposta dal server
      const result = await response.json();

      if (!response.ok) {
        // Mostra messaggio di errore
        errorMessageElement.style.color = "red";
        errorMessageElement.innerText = result.error || "An error occurred.";
      } else {
        // Mostra messaggio di successo
        errorMessageElement.style.color = "green";
        errorMessageElement.innerText = result.success || "Operation successful!";
        
        // Reindirizzamento dopo un login riuscito**
        if (apiEndpoint === "/api/auth/signin") { 
          setTimeout(() => {
            window.location.href = "auctions.html"; // Reindirizza alla pagina auctions.html
          }, 2000); // Tempo di attesa prima del reindirizzamento
        } else {
          setTimeout(() => {
            form.reset(); // Resetta i campi del modulo
            errorMessageElement.innerText = ""; // Pulisci il messaggio
          }, 2000);
        }
      }
    } catch (err) {
      console.error("Error:", err);
      errorMessageElement.style.color = "red";
      errorMessageElement.innerText = "Something went wrong. Please try again.";
    }
  }

  // Gestione del form di login
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Previene il comportamento predefinito del form
    handleFormSubmission(loginForm, loginErrorMessage, "/api/auth/signin");
  });

  // Gestione del form di registrazione
  registerForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Previene il comportamento predefinito del form
    handleFormSubmission(registerForm, registerErrorMessage, "/api/auth/signup");
  });
});