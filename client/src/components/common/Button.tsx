import { Animated, BleepsProviderSettings, Illuminator, useBleeps } from '@arwes/react';
import { Animator } from '@arwes/react-animator'
import { FrameHeader, FrameOctagon, FrameUnderline, useFrameAssembler } from '@arwes/react-frames'
import { useRef } from 'react';


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