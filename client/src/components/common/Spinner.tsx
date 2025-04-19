export const Spinner: React.FC = () => {
    const Spinner = () => (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
        }}>
            <div className="sci-fi-spinner" />
        </div>
    );
    return (<Spinner />)
}