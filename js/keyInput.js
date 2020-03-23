function onDocumentKeyDown(event) {
    var keyCode = event.which;
    if (keyCode === 82) // "R" triggers a rally call.
      vim3d.publishRallyCall();
};

document.addEventListener("keydown", onDocumentKeyDown, false);
