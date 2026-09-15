export function openFilePicker(onPick) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*,.heic,.heif";
  input.onchange = () => {
    if (input.files && input.files[0]) onPick(input.files[0]);
  };
  input.click();
}
