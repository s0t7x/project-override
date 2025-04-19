import { Animated, BleepsProviderSettings, Illuminator, useBleeps } from '@arwes/react';
import { Animator } from '@arwes/react-animator'
import { FrameHeader, FrameOctagon, FrameUnderline, useFrameAssembler } from '@arwes/react-frames'
import { useRef } from 'react';


type BleepsNames = 'hover' | 'click' | 'type'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    children?: React.ReactNode;
  };

export const Input: React.FC<InputProps> = (props: any) => {
    const { children, onFocus, onMouseEnter, onInput, ...rest } = props;

    const bleeps = useBleeps<BleepsNames>()

    return (
        <Animated<HTMLInputElement>
      as="input"
      onFocus={(event) => {
        bleeps.hover?.play()
        onFocus?.(event)
      }}
      onInput={(event) => {
        bleeps.click?.play()
        onInput?.(event)
      }}
        {...rest}
    >
    </Animated>
    )
}