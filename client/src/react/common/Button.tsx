import { Animated, useBleeps } from '@arwes/react';


type BleepsNames = 'hover' | 'click'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  };

export const Button: React.FC<ButtonProps> = (props: any) => {
    const { children, onClick, onMouseEnter, onFocus, ...rest } = props;

    const bleeps = useBleeps<BleepsNames>()

    return (
        <Animated<HTMLButtonElement>
      as="button"
      onMouseEnter={() => {
        bleeps.hover?.play()
        onMouseEnter?.()
      }}
      onFocus={() => {
        bleeps.hover?.play()
        onFocus?.()
      }}
      onClick={(event) => {
        bleeps.click?.play()
        onClick?.(event)
      }}
        {...rest}
    >
      <div className="button-content">{children}</div>
    </Animated>
    )
}