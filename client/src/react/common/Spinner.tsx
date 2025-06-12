interface SpinnerProps {
    text?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ text = '' }) => {
    const Spinner = ({ text }: SpinnerProps) => (
        <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%'
        }}>
        <div style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
        }}>
            <div className="sci-fi-spinner" />
            <div className="sci-fi-spinner-internal" />
        </div>
            <span className="sci-fi-spinner-text" style={{ fontSize: 10, paddingTop: 10 }}>{text || ''}</span>
        </div>
    );
    return (<Spinner text={text}/>)
}