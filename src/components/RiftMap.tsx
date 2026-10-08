/** Real Summoner's Rift minimap (Riot Data Dragon map11): blue base bottom-left, red base top-right. */
export default function RiftMap() {
  return (
    <>
      <img className="map-bg" src={`${import.meta.env.BASE_URL}map/summoners-rift.png`} alt="Summoner's Rift" draggable={false} />
      <div className="map-shade" aria-hidden />
    </>
  )
}
