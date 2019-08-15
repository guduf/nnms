declare module "ink-text-input" {
  export interface TextInputProps {
		value: string,
		onChange: (value: string) => void,
		placeholder?: string,
		focus?: boolean,
		mask?: string,
		highlightPastedText?: boolean,
		showCursor?: boolean,
		stdin?: object,
		onSubmit?: (value: string) => void
  }
  export function TextInput(props: TextInputProps): React.ReactElement
  export default TextInput
}
