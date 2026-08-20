/**
 * Nothing in the modal slot unless a route fills it.
 *
 * Next renders `default` for a parallel slot that has no match — without this
 * file, any navigation that does not target the slot 404s the whole page.
 */
export default function ModalDefault() {
  return null;
}
