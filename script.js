
let onboardingIndex = 0;
function chiudiOnboarding(e) {
  if (e) e.stopPropagation();
  document.getElementById("onboarding").style.display = "none";
  localStorage.setItem("mplus_onboarding", "done");
}
function mostraSlide() {
  const slides = document.querySelectorAll(".onboarding-slide");
  slides.forEach(s => s.classList.remove("active"));
  if (slides[onboardingIndex]) slides[onboardingIndex].classList.add("active");
}
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem("mplus_onboarding")) {
    mostraSlide();
    document.getElementById("onboarding").addEventListener("click", () => {
      onboardingIndex++;
      mostraSlide();
    });
  } else {
    document.getElementById("onboarding").style.display = "none";
  }
});
